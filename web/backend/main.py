# FastAPI
import os
os.environ["PROTOCOL_BUFFERS_PYTHON_IMPLEMENTATION"] = "python"

# agar Python otomatis menggunakan sertifikat bawaan library 'certifi'
if "SSL_CERT_FILE" in os.environ:
    del os.environ["SSL_CERT_FILE"]
    
if "REQUESTS_CA_BUNDLE" in os.environ:
    del os.environ["REQUESTS_CA_BUNDLE"]

import requests
import time
import json
from fastapi import FastAPI, Cookie, HTTPException, Response, Depends, Query, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from typing import Annotated
from schemas.payload import LoginCredentials, ClusteringPayload, GenerationPayload
from services import scrap_articles, scrap_list_articles, scrap_content_articles, cluster_articles, generate_article
from utils import get_from_json, get_from_chromadb, save_to_chromadb
from config import settings
from datetime import datetime, timedelta
from jose import jwt
from sqlalchemy import func, desc, asc, or_
from sqlalchemy.orm import Session
# Pastikan jalur import ini sesuai dengan struktur foldermu
from config.database import get_db 
from models.models import Article

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"], # URL frontend
    allow_credentials=True, # WAJIB TRUE AGAR COOKIE BISA LEWAT
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Process-Time"]
)

def validate_mydigilearn_token(token):
    params_list = {
        "page": 1,
        "limit": 10
    }
    headers = settings.BASE_HEADERS.copy()
    headers["Authorization"] = f"Bearer {token}"

    # Memvalidate token dengan hit api mydigilearn
    response_list = requests.get(settings.URL_ARTICLE_LIST, params=params_list, headers=headers)
    if response_list.status_code != 200:
        raise HTTPException(
            status_code=401,
            detail="token tidak valid"
        )
    
    # Jika perlu
    # return response_list.json

def get_mydigilearn_token(mydigilearn_token: Annotated[str | None, Cookie()] = None):
    # print(f"token: {mydigilearn_token}")
    if not mydigilearn_token:
        raise HTTPException(
            status_code=401,
            detail="Sesi habis atau belum login"
        )
    
    validate_mydigilearn_token(mydigilearn_token)
    return mydigilearn_token

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
            status_code=401,
            detail="Login gagal: username atau password salah"
        )
    
    data = response.json()
    token = data["data"]["token"]
    # print(f"Token didapat: {token}")
    return {
        "status_code": 200,
        "status": "success", 
        "message": "token berhasil didapat",
        "token": token
    }

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now() + timedelta(hours=2)
    to_encode.update({"exp": expire})

    # Proses signing
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, settings.JWT_ALGORITHM)
    return encoded_jwt

# Login dan pembuatan cookie token
@app.post("/api/v1/auth/login")
# payload
def login_app(
    payload: LoginCredentials, 
    response: Response
):
    login_response = login_mydigilearn(payload.username, payload.password)
    if login_response["status_code"] != 200:
        raise HTTPException(
            status_code=401,
            detail="Login mydigilearn gagal, token gagal diambil"
        )
    
    agc_token = create_access_token({"sub": payload.username})
    mydigilearn_token = login_response["token"]

    response.set_cookie(
        key=settings.AGC_TOKEN_NAME,
        value=agc_token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=7200
    )

    response.set_cookie(
        key=settings.MYDIGILEARN_TOKEN_NAME,
        value=mydigilearn_token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=7200
    )

    return {
        "status_code": 200,
        "status": "success",
        "message": "Login mydigilearn berhasil, token berhasil",
        "agc_token": agc_token,
        "mydigilearn_token": mydigilearn_token
    }

# Logout
@app.post("/api/v1/auth/logout")
def logout_app(
    response: Response
):
    response.delete_cookie(
        key=settings.AGC_TOKEN_NAME,
        httponly=True,
        secure=False,
        samesite="lax"
    )
    response.delete_cookie(
        key=settings.MYDIGILEARN_TOKEN_NAME,
        httponly=True,
        secure=False,
        samesite="lax"
    )
    
    return {
        "status_code": 200,
        "status": "success",
        "message": "Logout berhasil, sesi telah dihapus"
    }

@app.get("/api/v1/data/articles")
async def get_all_articles(
    search: str = Query("", description="Kata kunci pencarian"),
    type: str = Query("all", description="Filter berdasarkan status/tipe"),
    sort: str = Query("newest", description="Urutan artikel"),
    limit: str = Query("10", description="Batasan jumlah artikel"),
    db: Session = Depends(get_db),
    token: str = Depends(get_mydigilearn_token)
):
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
                    Article.title.ilike(search_term),
                    Article.content.ilike(search_term)
                )
            )

        # 3. Filter by Type (Kita asumsikan 'type' di UI sama dengan kolom 'status' di DB)
        if type != "all":
            query = query.filter(Article.status == type)

        # 4. Sorting
        # Asumsikan ada kolom 'created_at'. Jika tidak, gunakan 'id' sebagai representasi waktu masuk.
        if sort == "newest":
            query = query.order_by(desc(Article.id)) 
        elif sort == "oldest":
            query = query.order_by(asc(Article.id))
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
            formatted_articles.append({
                "id": str(art.id),
                "title": art.title,
                "content": art.content,
                "type": art.status,
                # Gunakan tanggal hari ini sebagai fallback jika kolom created_at tidak ada
                "date": art.created_at.strftime("%Y-%m-%d") if hasattr(art, 'created_at') and art.created_at else "2026-05-28"
            })

        return {
            "status_code": 200,
            "status": "success",
            "message": f"Berhasil menarik {len(formatted_articles)} artikel.",
            "data": formatted_articles
        }

    except Exception as e:
        return {
            "status_code": 500,
            "status": "error",
            "message": str(e)
        }

# Data keseluruhan
@app.get("/api/v1/data/stats")
def data_stats(
    token: str = Depends(get_mydigilearn_token),
    db: Session = Depends(get_db) 
):  
    start_time = time.perf_counter()
    print("== Mengambil Statistik Dashboard dari PostgreSQL ==")
    
    # == DATA SCRAP ==
    # Total semua data yang pernah ditarik slug-nya
    total_data_list = db.query(Article).count()
    
    # Total data yang sudah punya konten (statusnya BUKAN slug_only)
    total_data_content = db.query(Article).filter(Article.status != "slug_only").count()
    
    # Total data di ChromaDB. 
    # Alih-alih memanggil ChromaDB yang memakan waktu, kita baca dari status sinkronisasi Postgres!
    total_data_db = db.query(Article).filter(
        Article.status.in_(["vectorized", "clustered", "outlier_cluster", "generated"])
    ).count()

    # == DATA CLUSTER / TOPIC == 
    # Hitung jumlah topik unik (distinct) yang tidak kosong
    total_data_topic = db.query(Article.cluster_topic).filter(
        Article.cluster_topic.isnot(None)
    ).distinct().count()
    
    # Hitung jumlah topik unik (distinct) yang berstatus direkomendasikan
    total_data_rec_topic = db.query(Article.cluster_topic).filter(
        Article.is_recommended == True
    ).distinct().count()

    # Hitung jumlah article yang berstatus "clustered"
    total_data_article_clustered = db.query(Article).filter(Article.status == "clustered").count()

    # Hitung jumlah article yang berstatus "outlier_cluster"
    total_data_article_outlier = db.query(Article).filter(Article.status == "outlier_cluster").count()

    # == DATA GENERATE ==
    # Asumsi: jika ada artikel yang sudah di-generate AI, statusnya berubah menjadi 'generated'
    total_data_generate = db.query(Article).filter(Article.status == "generated").count()

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
                "total_data_db": total_data_db
            },
            "cluster": {
                "total_data_article_clustered": total_data_article_clustered,
                "total_data_article_outlier": total_data_article_outlier,
                "total_data_topic": total_data_topic,
                "total_data_keyword": total_data_topic * 4,
                "total_data_rec_topic": total_data_rec_topic,
                "total_data_rec_keyword": total_data_rec_topic * 4,
            },
            "generate": {
                "total_data_generate": total_data_generate
            }
        }
    }

# Data analytics
@app.get("/api/v1/data/analytics")
def data_analytics(
    token: str = Depends(get_mydigilearn_token),
    db: Session = Depends(get_db),
    topic_sort : str = Query("desc")
):
    start_time = time.perf_counter()
    # print(token)

    # == Query Pie Chart == 
    # Mengelompokkan berdasarkan kolom 'status'
    print("Mengelompokkan berdasarkan kolom 'status'")
    status_group = db.query(
        Article.status,
        func.count(Article.id).label("total")
    ).group_by(Article.status).all()
    
    # Format untuk frontend
    pie_data = [
        {
            "name": status, # Terpaksa pakai key name karena pie chart, hanya bisa membaca dengan key ini
            "value": total
        }
        for status, total in status_group
    ]

    # == Query Bar Chart
    # Mengelompokkan berdasarkan 'cluster_topic', diurutkan dari terbanyak
    print("Mengelompokkan berdasarkan kolom 'status'")
    base_query = db.query(
        Article.cluster_topic,
        func.count(Article.id).label("total")
    ).filter(Article.cluster_topic.isnot(None)) \
     .group_by(Article.cluster_topic) \
     
    if topic_sort == "asc":
        topic_group = base_query.order_by(asc("total")).limit(10).all()
    else:
        topic_group = base_query.order_by(desc("total")).limit(10).all()
    
    # Format untuk frontend
    bar_data = [
        {
            "topic": topic,
            "count": total
        }
        for topic, total in topic_group
    ]

    end_time = time.perf_counter()
    exec_time_sec = str(round(end_time - start_time, 2)) + "s"

    return {
        "status_code": 200,
        "status": "success",
        "message": "data analytics pie dan bar char berhasil diambil",
        "exec_time": exec_time_sec,
        "data": {
            "pie_data": pie_data,
            "bar_data": bar_data
        }
    }

# Data Cluster
@app.get("/api/v1/data/cluster")
async def get_data_cluster(
    token: str = Depends(get_mydigilearn_token),
    db: Session = Depends(get_db)
):  
    start_time = time.perf_counter()

    # Mengambil data clustered yang diperlukan
    articles = db.query(
        Article.cluster_topic,
        Article.is_recommended,
        Article.cluster_keywords
    ).filter(
        Article.status == "clustered",
        Article.cluster_topic.isnot(None)
    ).all()

    topic_map = {}
    unique_keywords = set()

    # 2. Proses agregasi
    for topic, is_rec, keywords in articles:
        if topic not in topic_map:
            topic_map[topic] = {
                "is_rec": is_rec,
                "keywords": set(),
                "article_count": 0
            }
        elif is_rec:
            topic_map[topic]["is_rec"] = True
        
        # Penambahan article_count untuk suatu topik
        topic_map[topic]["article_count"] += 1

        if keywords:
            kw_list = []
            if isinstance(keywords, list):
                kw_list = keywords
            elif isinstance(keywords, str):
                kw_list = [k.strip() for k in keywords.replace("{", "").replace("}", "").replace('"', '').replace("'", "").split(",")]

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
            "article_count": data["article_count"]
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
        "data": {
            "topics": formatted_topics
        }
    }

# Scraping
@app.post("/api/v1/run/scrap/articles")
# Cookie, query param
async def run_scrap_articles(
    token: str = Depends(get_mydigilearn_token), 
    mode: str = Query("both"),
    max_scrap: int = Query(10),
    overlap_limit: int = Query(10),
    page: int = Query(1),
    limit_article_per_page: int = Query(10)
):  
    print(f"max_scrap dari query: {max_scrap}")
    response = await scrap_articles(token, mode, max_scrap, overlap_limit, page, limit_article_per_page)
    return response


# Clustering
@app.post("/api/v1/run/cluster")
# Cookie
def run_cluster(
    payload: ClusteringPayload,
    token: str = Depends(get_mydigilearn_token)
):
    print(f"Payload clustering: \n{payload}")
    response = cluster_articles(payload, token)
    return response

# Generating
@app.post("/api/v1/run/generate")
# Cookie
async def run_generate(
    payload: GenerationPayload,
    token: str = Depends(get_mydigilearn_token),
):
    print(f"payload: \n{payload}")

    payloadJson = payload.json()
    print(f"payload json: \n${payloadJson}")
    
    response = await generate_article(payload.topics, payload.keywords, payload.prompt, payload.model, payload.model_api_key)
    return response

# ==================
# Data Articles
@app.get("/api/v1/data/articles")
# Cookie
def data_articles(
    token: str = Depends(get_mydigilearn_token),
    limit: int = Query(10),
    offset: int = Query(0)
):    
    # Cek data list dan content
    data_list_article = get_from_json(settings.FILE_LIST_PATH)
    data_content_article = get_from_json(settings.FILE_CONTENT_PATH)

    # Cek database
    print("📦 Menarik Vektor dari Database Lokal...")
    print(f"DB status: {settings.DB_NAME}")
    print(f"DB Path: {settings.DB_PATH}")
    collection = get_from_chromadb(settings.DB_PATH, settings.DB_NAME)
    data_db = collection.get(
        limit=limit,
        offset=offset,
        include=['documents', 'metadatas'])
    print("Total data di ChromaDB:", collection.count())
    
    return {
        "status_code": 200,
        "status": "success",
        "message": "data artikel berhasil diambil",
        "data": {
            "total_data_list": len(data_list_article),
            "total_data_content": len(data_content_article),
            "chromadb": {
                "total_data_db": collection.count(),
                "data_db": data_db,
                "limit": limit,
                "offset": offset,
            }
        }
    }

# Data topics
@app.get("/api/v1/data/topics")
# Cookie
async def data_topics(
    token: str = Depends(get_mydigilearn_token),
    limit: int = Query(10),
    offset: int = Query(0)
):       
    data_topics = get_from_json(settings.FILE_TOPIC_DATA_PATH)
    
    # Cluster == topik
    metadatas_topics = data_topics["metadatas"]
    clusters_topics = data_topics["clusters"]

    selected_clusters_topics = clusters_topics[offset: offset + limit]
        
    # Jika berhasil, kembalikan data
    return {
        "status_code": 200,
        "status": "success",
        "message": "Data topik berhasil diambil",
        "data": {
            "metadatas": metadatas_topics,
            "topics": selected_clusters_topics,
            "limit": limit,
            "offset": offset,
        }
    }

# Sync dengan data list dan content
@app.post("/api/v1/sync/db")
def sync_db(token: str = Depends(get_mydigilearn_token)):
    data_list = get_from_json(settings.FILE_LIST_PATH)
    total_data_list = len(data_list)

    data_content = get_from_json(settings.FILE_CONTENT_PATH)
    total_data_content = len(data_content)

    save_to_chromadb(token, data_content)

    data_content = get_from_json(settings.FILE_CONTENT_PATH)
    total_data_content = len(data_content)

    collection = get_from_chromadb(settings.DB_PATH, settings.DB_NAME)
    total_data_db = collection.count()

    return {
        "status_code": 200,
        "status": "success",
        "message": f"sinkronisasi database berhasil",
        "data": {
            "total_data_list": total_data_list,
            "total_data_content": total_data_content,
            "total_data_db": total_data_db
        }
    }

@app.post("/api/v1/run/scrap/list")
# Cookie, query param
async def run_scrap_list_articles(
    token: str = Depends(get_mydigilearn_token), 
    mode: str = Query("both"),
    max_scrap: int = Query(10),
):  
    response = await scrap_list_articles(token, mode, max_scrap)
    return response

# Scrap content atau sync dengan data list
@app.post("/api/v1/run/scrap/content")
# Cookie, query param
def run_scrap_content_articles(
    token: str = Depends(get_mydigilearn_token), 
    max_scrap: int = Query(10),
):  
    headers = settings.BASE_HEADERS.copy()
    headers["Authorization"] = f"Bearer {token}"
    response = scrap_content_articles(headers, max_scrap)
    return response