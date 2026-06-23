import json
import os
import re
from datetime import datetime

import chromadb
import pandas as pd
from bs4 import BeautifulSoup
from chromadb.utils import embedding_functions
from fastapi import HTTPException
from sentence_transformers import SentenceTransformer
from sqlalchemy.orm import Session

from config import settings
from config.database import SessionLocal
from models.models import Article


def get_from_json(file_path):
    file = []
    if os.path.exists(file_path):
        with open(file_path, "r", encoding="utf-8") as f:
            try:
                print("file local list terisi")
                file = json.load(f)

            except json.JSONDecodeError:
                print("File lokal list kosong atau rusak, mulai dari nol.")
                file = []

            except FileNotFoundError:
                # Menangani Skenario 1: File belum ada raise HTTPException(
                # status_code=404, detail="Data topik belum tersedia. Silakan
                #     jalankan proses clustering terlebih dahulu." )

                # OPSI LAIN: Jika kamu tidak mau frontend error, kamu bisa
                # me-return array kosong
                return {
                    "status_code": 200,
                    "status": "success",
                    "message": "File belum tersedia",
                }

            except Exception as e:
                # Menangani error tak terduga lainnya
                #  (misal: file sedang dikunci oleh
                #  sistem operasi)
                raise HTTPException(
                    status_code=500,
                    detail=f"Terjadi kesalahan internal pada server: {str(e)}",
                )

    return file


def save_to_json(file_path, data):
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=4)
        print(f"data telah tersimpan di {file_path}")


def merge_and_save_articles_list_to_json(local_article, new_article):
    # Merge Data
    dirty_data_merge = local_article + new_article

    # Deduplicate (Ubah jadi dictionary agar otomatis unik)
    data_unique_dict = {item["id_inc"]: item for item in dirty_data_merge}

    # Kembalikan lagi wujudnya menjadi List
    data_final = list(data_unique_dict.values())

    # Sorting (Terbaru di Atas, Terlama di Bawah)
    data_final.sort(key=lambda artikel: artikel["id_inc"], reverse=True)

    # Simpan kembali ke lokal
    save_to_json(settings.FILE_LIST_PATH, data_final)

    print(f"data lokal: {len(local_article)}")
    print(f"data baru: {len(new_article)}")

    print(
        f"🎉 Sukses! Tersimpan {len(data_final)} artikel yang sudah rapi dan terurut."
    )


def get_from_chromadb(db_path, db_name):
    client = chromadb.PersistentClient(path=db_path)
    collection = client.get_or_create_collection(name=db_name)

    return collection


def save_to_chromadb(token, data_to_sync):
    if not data_to_sync:
        print("✨ Tidak ada artikel baru. ChromaDB dan PostgreSQL sudah sinkron!")
        return

    print(f"🚀 Memulai Preprocessing {len(data_to_sync)} artikel untuk ChromaDB...")

    df = pd.DataFrame(data_to_sync)
    print("🚀 Memulai Preprocessing data content untuk disimpan di ChromaDB...")

    # Clear html
    df["clean_content"] = df["content"].apply(clear_html)

    # Menggabungkan tags
    if "tags" in df.columns:
        df["tags_string"] = df["tags"].apply(
            lambda x: " ".join(x) if isinstance(x, list) else ""
        )
    else:
        df["tags_string"] = ""

    # Menggabungkan data title, content, dan tags
    df["complete_data"] = (
        df["title"] + " " + df["tags_string"] + " " + df["clean_content"]
    )

    # Menormalisasikan data
    df["ready_data"] = df["complete_data"].apply(text_normalization)

    # df_clean = df[['id_inc', 'id', 'slug', 'title', 'ready_data']]

    # Menghapus baris dengan data kosong
    df_clean = df.dropna(subset=["ready_data"])

    # Intip hasilnya
    # df_clean.info()
    # print(df_clean.head())
    # df_clean.to_csv(settings.FILE_READY_DATA_PATH, index=False)

    if df_clean.empty:
        print("⚠️ Peringatan: Seluruh data gagal diproses NLP (hasil teks kosong).")
        return

    print("🚀 Memulai Vektorisasi Otomatis via ChromaDB...")

    client = chromadb.PersistentClient(path=settings.DB_CHROMA_PATH)
    print(f"model embedding: {settings.MODEL_EMBEDDING_NAME}")
    embedder = embedding_functions.SentenceTransformerEmbeddingFunction(
        model_name=settings.MODEL_EMBEDDING_NAME
    )
    collection = client.get_or_create_collection(
        name=settings.DB_NAME, embedding_function=embedder
    )

    daftar_id = df_clean["id"].tolist()
    daftar_dokumen = df_clean["ready_data"].tolist()
    daftar_metadata = [{"source": "agc_pipeline"} for _ in daftar_id]

    collection.upsert(
        ids=daftar_id, documents=daftar_dokumen, metadatas=daftar_metadata
    )

    print(f"🎉 Selesai! {len(daftar_id)} vektor baru berhasil ditanam ke ChromaDB.")
    print(f"📦 Total data di ChromaDB saat ini: {collection.count()} artikel.")
    print(f"db path: {settings.DB_CHROMA_PATH}")


def save_generated_article(title_article, data_article):
    """
    Fungsi untuk membersihkan nama file dan menyimpannya sebagai .md
    """
    # 1. Bersihkan nama title_article untuk
    #  dijadikan nama file (hilangkan spasi
    #  jadi underscore)
    # Contoh: "Kondisi Ekonomi" -> "kondisi_ekonomi"
    file_name_safe = re.sub(r"[^a-zA-Z0-9]", "_", title_article.lower())
    file_name = f"{file_name_safe}.json"

    # 2. Tentukan lokasi folder penyimpanan (Mundur 1 folder ke 'data')
    folder_path = settings.FOLDER_GENERATION_DATA_PATH

    # 3. Buat foldernya jika belum ada
    os.makedirs(folder_path, exist_ok=True)

    # 4. Gabungkan folder dan nama file
    final_path = os.path.join(folder_path, file_name)

    # 5. Simpan file-nya (menggunakan encoding
    # utf-8 agar emoji dan karakter khusus aman)
    save_to_json(final_path, data_article)
    print(f"💾 Artikel berhasil disimpan di: {final_path}")


def clear_html(html_tag):
    # Mengupas semua tag HTML dan menyisakan teks murni
    if not html_tag:
        return ""
    return BeautifulSoup(html_tag, "html.parser").get_text(separator=" ")


def text_normalization(teks):
    teks = teks.lower()  # Huruf kecil semua
    teks = re.sub(r"[^a-z0-9\s]", " ", teks)  # Buang karakter aneh/tanda baca
    teks = re.sub(r"\s+", " ", teks).strip()  # Rapikan spasi ganda
    return teks


def log_msg(text: str, step: int = 0, total: int = 100, status: str = "processing"):
    print(text, flush=True)  # Mencetak langsung ke Terminal Docker
    return {"status": status, "text": text, "step": step, "total": total}


def parse_time(raw_time):
    parsed_time = None

    if raw_time:
        # Ganti "Z" menjadi "+00:00" agar dikenali Python sebagai UTC timezone
        safe_time_str = raw_time.replace("Z", "+00:00")
        parsed_time = datetime.fromisoformat(safe_time_str)

    return parsed_time


def generate_and_save_embeddings_to_db(articles_data):
    """
    Fungsi ini berjalan di thread terpisah.
    Menerima list of dict berisi 'id', 'title', 'tags', dan 'content'.
    """
    if not articles_data:
        return

    embedder = SentenceTransformer(
        model_name_or_path="paraphrase-multilingual-MiniLM-L12-v2",
        token=settings.HF_TOKEN,
    )

    # 1. Konversi data list of dict menjadi Pandas DataFrame
    df = pd.DataFrame(articles_data)

    # Antisipasi jika kolom tidak ada agar tidak KeyError
    if "title" not in df.columns:
        df["title"] = ""
    if "content" not in df.columns:
        df["content"] = ""

    # 2. Eksekusi pembersihan HTML
    df["clean_content"] = df["content"].apply(clear_html)

    # Menggabungkan tags (menangani kasus jika tags berupa list atau tidak ada)
    if "tags" in df.columns:
        df["tags_string"] = df["tags"].apply(
            lambda x: " ".join(x) if isinstance(x, list) else str(x)
        )
    else:
        df["tags_string"] = ""

    # Menggabungkan data title, content, dan tags dengan aman (hindari NaN)
    df["complete_data"] = (
        df["title"].fillna("").astype(str)
        + " "
        + df["tags_string"].astype(str)
        + " "
        + df["clean_content"].fillna("").astype(str)
    )

    # Menormalisasikan data
    df["ready_data"] = df["complete_data"].apply(text_normalization)

    # 3. Filter data kosong (Ubah string yang hanya berisi spasi menjadi NaN lalu drop)
    df["ready_data"] = df["ready_data"].replace(r"^\s*$", pd.NA, regex=True)
    df_clean = df.dropna(subset=["ready_data"]).copy()

    if df_clean.empty:
        return  # Hentikan proses jika semua teks ternyata kosong setelah dicuci

    # 4. Ekstraksi teks yang SUDAH BERSIH untuk proses vektorisasi
    texts = df_clean["ready_data"].tolist()

    # 5. Generasi matriks vektor
    embeddings = embedder.encode(texts)

    # 6. Buka sesi database baru khusus untuk thread ini
    db: Session = SessionLocal()
    try:
        # Gunakan df_clean agar ID yang
        # diperbarui benar-benar sejajar dengan urutan vektor
        for idx, (index, row) in enumerate(df_clean.iterrows()):
            article_id = row["id"]
            clean_text_data = str(row["ready_data"])
            vector_list = embeddings[idx].tolist()

            # Update baris artikel menggunakan SQLAlchemy
            db.query(Article).filter(Article.id == article_id).update(
                {
                    Article.clean_data: clean_text_data,
                    Article.embedding: vector_list,
                    Article.status: "vectorized"
                },
                synchronize_session=False,
            )

        db.commit()
    except Exception as e:
        db.rollback()
        raise e
    finally:
        db.close()
