# FastAPI
import os

os.environ["PROTOCOL_BUFFERS_PYTHON_IMPLEMENTATION"] = "python"

# agar Python otomatis menggunakan sertifikat bawaan library 'certifi'
if "SSL_CERT_FILE" in os.environ:
    del os.environ["SSL_CERT_FILE"]

if "REQUESTS_CA_BUNDLE" in os.environ:
    del os.environ["REQUESTS_CA_BUNDLE"]

import json
import time
from collections.abc import AsyncIterable
from datetime import datetime, timedelta, timezone
from typing import Annotated

import requests
from fastapi import (
    Depends,
    FastAPI,
    Header,
    HTTPException,
    Query,
    Response,
    UploadFile,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.sse import EventSourceResponse, ServerSentEvent
from jose import jwt
from sqlalchemy import asc, desc, func, not_, or_, text
from sqlalchemy.orm import Session

from config import settings
from config.database import engine, get_db
from models.models import Article, Base

# Pastikan jalur import ini sesuai dengan struktur foldermu
from schemas.payload import (
    ClusterPayload,
    GeneratePayload,
    LoginCredentials,
    ScrapPayload,
)
from services import (
    cluster_articles_stream,
    generate_article_stream,
    scrap_articles_stream,
)
from utils import log_msg

# Inisialisasi database pg
Base.metadata.create_all(bind=engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Process-Time"],
)


def validate_mydigilearn_token(token):
    params_list = {"page": 1, "limit": 10}
    headers = settings.BASE_HEADERS.copy()
    headers["Authorization"] = f"Bearer {token}"

    # Memvalidate token dengan hit api mydigilearn
    response_list = requests.get(
        settings.URL_ARTICLE_LIST, params=params_list, headers=headers
    )
    if response_list.status_code != 200:
        raise HTTPException(status_code=401, detail="token tidak valid")

    # Jika perlu
    # return response_list.json


def get_mydigilearn_token(authorization: Annotated[str | None, Header()] = None):
    # print(f"token: {mydigilearn_token}")
    if not authorization:
        raise HTTPException(status_code=401, detail="Sesi habis atau belum login")

    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Format token salah")

    token = authorization.split(" ")[1]

    validate_mydigilearn_token(token)

    return token


def login_mydigilearn(username, password):
    credentials = settings.BASE_CREDENTIALS.copy()
    credentials["username"] = username
    credentials["password"] = password

    print(f"ROOT_DIR: {settings.ROOT_DIR}")
    print(f"Mencoba login ke {settings.URL_LOGIN} dengan user: {username}")
    response = requests.post(settings.URL_LOGIN, json=credentials)

    if response.status_code != 200:
        print("Login gagal")
        raise HTTPException(
            status_code=401, detail="Login gagal: username atau password salah"
        )

    data = response.json()
    token = data["data"]["token"]
    # print(f"Token didapat: {token}")
    return {
        "status_code": 200,
        "status": "success",
        "message": "token berhasil didapat",
        "token": token,
    }


def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now() + timedelta(hours=2)
    to_encode.update({"exp": expire})

    # Proses signing
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, settings.JWT_ALGORITHM)
    return encoded_jwt


@app.get("/health")
def health_check():
    return {"status_code": 200, "status": "ok", "message": "Health Ok"}


# Login dan pembuatan cookie token
@app.post("/api/v1/auth/login")
# payload
def login_app(payload: LoginCredentials, response: Response):
    login_response = login_mydigilearn(payload.username, payload.password)
    if login_response["status_code"] != 200:
        raise HTTPException(
            status_code=401, detail="Login mydigilearn gagal, token gagal diambil"
        )

    agc_token = create_access_token({"sub": payload.username})
    mydigilearn_token = login_response["token"]

    # response.set_cookie(
    #     key=settings.AGC_TOKEN_NAME,
    #     value=agc_token,
    #     httponly=True,
    #     secure=True,
    #     samesite="none",
    #     max_age=7200,
    # )

    # response.set_cookie(
    #     key=settings.MYDIGILEARN_TOKEN_NAME,
    #     value=mydigilearn_token,
    #     httponly=True,
    #     secure=True,
    #     samesite="none",
    #     max_age=7200,
    # )

    return {
        "status_code": 200,
        "status": "success",
        "message": "Login mydigilearn berhasil, token berhasil",
        "agc_token": agc_token,
        "mydigilearn_token": mydigilearn_token,
    }


# Logout
@app.post("/api/v1/auth/logout")
def logout_app(response: Response):
    response.delete_cookie(
        key=settings.AGC_TOKEN_NAME, httponly=True, secure=True, samesite="none"
    )
    response.delete_cookie(
        key=settings.MYDIGILEARN_TOKEN_NAME, httponly=True, secure=True, samesite="none"
    )

    return {
        "status_code": 200,
        "status": "success",
        "message": "Logout berhasil, sesi telah dihapus",
    }


@app.get("/api/v1/data/articles")
async def get_data_articles(
    search: str = Query("", description="Kata kunci pencarian"),
    type: str = Query("all", description="Filter berdasarkan status/tipe"),
    sort: str = Query("newest", description="Urutan artikel"),
    limit: str = Query("10", description="Batasan jumlah artikel"),
    db: Session = Depends(get_db),
    token: str = Depends(get_mydigilearn_token),
):
    start_time = time.perf_counter()

    try:
        print(f"search: {search}")
        print(f"type: {type}")
        print(f"sort: {sort}")
        print(f"limit: {limit}")

        # 1. Base Query
        query = db.query(Article)

        # 2. Filter by Search Query (Judul atau Konten)
        if search.strip():
            search_term = f"%{search.strip()}%"
            query = query.filter(
                or_(
                    Article.title.ilike(search_term), Article.content.ilike(search_term)
                )
            )

        # 3. Filter by Type (Kita asumsikan 'type' di UI sama dengan kolom
        #    'status' di DB)
        if type != "all":
            query = query.filter(Article.status == type)
        else:
            query = query.filter(Article.status != "generated")

        # 4. Sorting Asumsikan ada kolom 'created_at'. Jika tidak, gunakan 'id'
        # sebagai representasi waktu masuk.
        if sort == "newest":
            query = query.order_by(
                Article.published_at.desc().nulls_last(), Article.id.desc()
            )
        elif sort == "oldest":
            query = query.order_by(
                Article.published_at.asc().nulls_last(), Article.id.asc()
            )
        elif sort == "az":
            query = query.order_by(asc(Article.title))
        elif sort == "za":
            query = query.order_by(desc(Article.title))

        # 5. Limiting
        if limit != "all":
            query = query.limit(int(limit))

        # Eksekusi Query
        articles_db = query.all()

        # Format Data
        formatted_articles = []
        for art in articles_db:
            if hasattr(art, "published_at") and art.published_at:
                display_date = art.published_at.strftime("%Y-%m-%d")
            else:
                display_date = "Belum Diketahui"

            formatted_articles.append(
                {
                    "id": str(art.id),
                    "title": art.title,
                    "content": art.content,
                    "status": art.status,
                    "date": display_date,
                }
            )

        end_time = time.perf_counter()
        exec_time_sec = str(round(end_time - start_time)) + "s"

        return {
            "status_code": 200,
            "status": "success",
            "message": f"Berhasil menarik {len(formatted_articles)} artikel.",
            "data": formatted_articles,
            "exec_time": exec_time_sec,
        }

    except Exception as e:
        return {"status_code": 500, "status": "error", "message": str(e)}


# Data keseluruhan
@app.get("/api/v1/data/stats")
def get_data_stats(
    db: Session = Depends(get_db),
    token: str = Depends(get_mydigilearn_token),
):
    start_time = time.perf_counter()
    print("== Mengambil Statistik Dashboard dari PostgreSQL ==")

    # == DATA SCRAP ==
    # Total semua data yang pernah ditarik slug-nya
    total_data_list = db.query(Article).count()

    # Total data yang sudah punya konten (statusnya BUKAN slug_only)
    total_data_content = db.query(Article).filter(Article.status != "slug_only").count()

    # Total data di ChromaDB. Alih-alih memanggil ChromaDB yang memakan waktu,
    # kita baca dari status sinkronisasi Postgres!
    total_data_db = (
        db.query(Article)
        .filter(
            Article.status.in_(
                ["vectorized", "clustered", "outlier_cluster", "generated"]
            )
        )
        .count()
    )

    # == DATA CLUSTER / TOPIC ==
    # Hitung jumlah topik unik (distinct) yang tidak kosong
    total_data_topic = (
        db.query(Article.cluster_topic)
        .filter(Article.cluster_topic.isnot(None))
        .distinct()
        .count()
    )

    # Hitung jumlah topik unik (distinct) yang berstatus direkomendasikan
    total_data_rec_topic = (
        db.query(Article.cluster_topic)
        .filter(Article.is_recommended)
        .distinct()
        .count()
    )

    # Hitung jumlah article yang berstatus "clustered"
    total_data_article_clustered = (
        db.query(Article).filter(Article.status == "clustered").count()
    )

    # Hitung jumlah article yang berstatus "outlier_cluster"
    total_data_article_outlier = (
        db.query(Article).filter(Article.status == "outlier_cluster").count()
    )

    # == DATA GENERATE == Asumsi: jika ada artikel yang sudah di-generate AI,
    # statusnya berubah menjadi 'generated'
    total_data_generate = (
        db.query(Article).filter(Article.status == "generated").count()
    )

    end_time = time.perf_counter()
    exec_time_sec = str(round(end_time - start_time, 2)) + "s"

    return {
        "status_code": 200,
        "status": "success",
        "message": "Data statistik keseluruhan berhasil diambil secara instan",
        "exec_time": exec_time_sec,
        "data": {
            "scrap": {
                "total_data_list": total_data_list,
                "total_data_content": total_data_content,
                "total_data_db": total_data_db,
            },
            "cluster": {
                "total_data_article_clustered": total_data_article_clustered,
                "total_data_article_outlier": total_data_article_outlier,
                "total_data_topic": total_data_topic,
                "total_data_keyword": total_data_topic * 4,
                "total_data_rec_topic": total_data_rec_topic,
                "total_data_rec_keyword": total_data_rec_topic * 4,
            },
            "generate": {"total_data_generate": total_data_generate},
        },
    }


# Data analytics
@app.get("/api/v1/data/analytics")
def get_data_analytics(
    topic_sort: str = Query("desc"),
    db: Session = Depends(get_db),
    token: str = Depends(get_mydigilearn_token),
):
    start_time = time.perf_counter()
    # print(token)

    # == Query Pie Chart ==
    # Mengelompokkan berdasarkan kolom 'status'
    print("Mengelompokkan berdasarkan kolom 'status'")
    status_group = (
        db.query(Article.status, func.count(Article.id).label("total"))
        .group_by(Article.status)
        .all()
    )

    # Format untuk frontend
    pie_data = [
        {
            # Terpaksa pakai key name karena pie chart, hanya bisa membaca
            # dengan key ini
            "name": status,
            "value": total,
        }
        for status, total in status_group
    ]

    # == Query Bar Chart
    # Mengelompokkan berdasarkan 'cluster_topic', diurutkan dari terbanyak
    print("Mengelompokkan berdasarkan kolom 'status'")
    base_query = (
        db.query(Article.cluster_topic, func.count(Article.id).label("total"))
        .filter(
            Article.cluster_topic.isnot(None),
            Article.status == "clustered",
            not_(Article.cluster_topic.ilike("%outlier%")),
        )
        .group_by(Article.cluster_topic)
    )
    if topic_sort == "asc":
        topic_group = base_query.order_by(asc("total")).limit(10).all()
    else:
        topic_group = base_query.order_by(desc("total")).limit(10).all()

    # Format untuk frontend
    bar_data = [{"topic": topic, "count": total} for topic, total in topic_group]

    end_time = time.perf_counter()
    exec_time_sec = str(round(end_time - start_time, 2)) + "s"

    return {
        "status_code": 200,
        "status": "success",
        "message": "data analytics pie dan bar char berhasil diambil",
        "exec_time": exec_time_sec,
        "data": {"pie_data": pie_data, "bar_data": bar_data},
    }


# Data Cluster
@app.get("/api/v1/data/cluster")
async def get_data_cluster(
    db: Session = Depends(get_db),
    token: str = Depends(get_mydigilearn_token),
):
    start_time = time.perf_counter()

    # Mengambil data clustered yang diperlukan
    articles = (
        db.query(
            Article.cluster_topic, Article.is_recommended, Article.cluster_keywords
        )
        .filter(Article.status == "clustered", Article.cluster_topic.isnot(None))
        .all()
    )

    topic_map = {}
    # unique_keywords = set()

    # 2. Proses agregasi
    for topic, is_rec, keywords in articles:
        if topic not in topic_map:
            topic_map[topic] = {"is_rec": is_rec, "keywords": set(), "article_count": 0}
        elif is_rec:
            topic_map[topic]["is_rec"] = True

        # Penambahan article_count untuk suatu topik
        topic_map[topic]["article_count"] += 1

        if keywords:
            kw_list = []
            if isinstance(keywords, list):
                kw_list = keywords
            elif isinstance(keywords, str):
                kw_list = [
                    k.strip()
                    for k in keywords.replace("{", "")
                    .replace("}", "")
                    .replace('"', "")
                    .replace("'", "")
                    .split(",")
                ]

            for kw in kw_list:
                if kw:
                    topic_map[topic]["keywords"].add(kw)

    # 3. Format output sesuai kebutuhan state React
    formatted_topics = [
        {
            "id": f"topic{i}",
            "name": name,
            "color": "green" if data["is_rec"] else "default",
            "keywords": list(data["keywords"])[:8],
            "article_count": data["article_count"],
        }
        for i, (name, data) in enumerate(topic_map.items())
    ]

    # print(f"formatted_topics: \n{formatted_topics}")

    end_time = time.perf_counter()
    exec_time_sec = str(round(end_time - start_time)) + "s"

    return {
        "status_code": 200,
        "status": "success",
        "message": "Data cluster/topik berhasil diambil",
        "exec_time": exec_time_sec,
        "data": {"topics": formatted_topics},
    }


# Data Clusterable Article
@app.get("/api/v1/data/count-clusterable")
def get_clusterable_count(
    days_ago: int = 0,
    db: Session = Depends(get_db),
    token: str = Depends(get_mydigilearn_token),
):
    query = db.query(Article.id).filter(
        Article.status.in_(["vectorized", "clustered", "outlier_cluster"])
    )

    if days_ago > 0:
        target_date = datetime.now(timezone.utc) - timedelta(days=days_ago)
        query = query.filter(Article.published_at >= target_date)

    # Hanya menghitung jumlah baris, sangat cepat!
    total_count = query.count()

    return {"status": "success", "count": total_count}


@app.get("/api/v1/data/export")
def export_database(
    db: Session = Depends(get_db), token: str = Depends(get_mydigilearn_token)
):
    try:
        articles = db.query(Article).all()

        # Susun data
        export_data = []
        for art in articles:
            export_data.append(
                {
                    "id": art.id,
                    "id_inc": art.id_inc,
                    "slug": art.slug,
                    "title": art.title,
                    "content": art.content,
                    "status": art.status,
                    "cluster_topic": art.cluster_topic,
                    "cluster_keywords": art.cluster_keywords,
                    "is_recommended": art.is_recommended,
                }
            )

        # Ubah menjadi string json
        json_str = json.dumps(export_data, indent=4)

        # Agar langsung terdownload
        return Response(
            content=json_str,
            media_type="application/json",
            headers={
                "Content-Disposition": "attachment; "
                "filename=backup_database_article.json"
            },
        )
    except Exception as e:
        return {"status_code": 500, "message": f"Gagal melakukan export: {e}"}


@app.post("/api/v1/data/import")
async def import_database(
    file: UploadFile,
    db: Session = Depends(get_db),
    token: str = Depends(get_mydigilearn_token),
):
    start_time = time.perf_counter()

    # Validasi tipe file
    if not file.filename.endswith(".json"):
        return {
            "status_code": 400,
            "status": "error",
            "message": "File harus berformat JSON!",
        }

    try:
        contents = await file.read()
        data = json.loads(contents)

        if not isinstance(data, list):
            return {
                "status_code": 400,
                "status": "error",
                "message": "Format JSON tidak valid. Harus berupa List of Objects.",
            }

        import_count = 0
        for item in data:
            db.merge(Article(**item))
            import_count += 1
        db.commit()

        end_time = time.perf_counter()
        exec_time_sec = str(round(end_time - start_time)) + "s"

        return {
            "status_code": 200,
            "status": "success",
            "message": f"Berhasil mengimpor {import_count} artikel ke dalam database!",
            "exec_time": exec_time_sec,
        }
    except json.JSONDecodeError:
        return {
            "status_code": 400,
            "status": "error",
            "message": "File JSON korup atau rusak.",
        }
    except Exception as e:
        db.rollback()
        return {
            "status_code": 500,
            "status": "error",
            "message": f"Gagal melakukan import: {str(e)}",
        }


@app.delete("/api/v1/data/reset")
def reset_database(
    db: Session = Depends(get_db), token: str = Depends(get_mydigilearn_token)
):
    print("Mencoba reset db")

    try:
        db.execute(text("TRUNCATE TABLE articles RESTART IDENTITY"))
        db.commit()

        return {
            "status_code": 200,
            "status": "success",
            "message": "Tabel articles berhasil di-reset",
        }
    except Exception as e:
        db.rollback()
        return {
            "status_code": 500,
            "status": "error",
            "message": f"Gagal melakukan reset database: {str(e)}",
        }


# Scraping
@app.post("/api/v1/run/scrap", response_class=EventSourceResponse)
async def run_scrap(
    payload: ScrapPayload,
    token: str = Depends(get_mydigilearn_token),
) -> AsyncIterable[ServerSentEvent]:

    # Awal
    yield ServerSentEvent(data=log_msg("Membangun koneksi scraping aman...", 0))

    # Eksekusi Orkestrator dan semburkan eventnya ke Frontend
    async for event_dict in scrap_articles_stream(payload, token):
        yield ServerSentEvent(data=event_dict)


# Clustering
@app.post("/api/v1/run/cluster", response_class=EventSourceResponse)
# Cookie
async def run_cluster(
    payload: ClusterPayload,
    response: Response,
    token: str = Depends(get_mydigilearn_token),
) -> AsyncIterable[ServerSentEvent]:
    # print(f"Payload clustering: \n{payload}")

    # Awal
    yield ServerSentEvent(data=log_msg("Membangun koneksi clustering...", 0))

    # Eksekusi Streaming
    async for event_dict in cluster_articles_stream(payload, token):
        yield ServerSentEvent(data=event_dict)


# Generating
@app.post("/api/v1/run/generate", response_class=EventSourceResponse)
# Cookie
async def run_generate(
    payload: GeneratePayload,
    response: Response,
    token: str = Depends(get_mydigilearn_token),
) -> AsyncIterable[ServerSentEvent]:
    # return {
    #     "status_code": 400,
    #     "status": "fail",
    #     "message": "oke, gagal"
    # }
    # print(f"payload: \n{payload}")

    # payloadJson = payload.json()
    # print(f"payload json: \n${payloadJson}")

    # Awal
    yield ServerSentEvent(data=log_msg("Membangun koneksi generator...", 0))

    # Eksekusi
    async for event_dict in generate_article_stream(payload):
        yield ServerSentEvent(data=event_dict)
