import os

os.environ["PROTOCOL_BUFFERS_PYTHON_IMPLEMENTATION"] = "python"

# agar Python otomatis menggunakan sertifikat bawaan library 'certifi'
if "SSL_CERT_FILE" in os.environ:
    del os.environ["SSL_CERT_FILE"]

if "REQUESTS_CA_BUNDLE" in os.environ:
    del os.environ["REQUESTS_CA_BUNDLE"]

import chromadb

from config import settings
from config.database import SessionLocal
from models.models import Article


def nuke_and_reset():
    print("🔥 Menghapus koleksi hantu di ChromaDB...")
    client = chromadb.PersistentClient(path=settings.DB_CHROMA_PATH)

    try:
        # Menghapus koleksi lama sampai akar-akarnya
        client.delete_collection(name=settings.DB_NAME)
        print("✅ ChromaDB berhasil dikosongkan.")
    except Exception as e:
        print(f"⚠️ Koleksi mungkin sudah kosong: {e}")

    print("\n🔄 Memutar balik status di PostgreSQL...")
    db = SessionLocal()
    try:
        # Kembalikan semua artikel menjadi 'scraped' agar masuk antrean vektorisasi lagi
        # Hapus juga label cluster lama yang tidak valid
        db.query(Article).update(
            {
                "status": "scraped",
                "cluster_topic": None,
                "cluster_keywords": "{}",
                "is_recommended": False,
            }
        )
        db.commit()
        print("✅ 567 Artikel di Postgres siap di-vektorisasi ulang.")
    except Exception as e:
        db.rollback()
        print(f"❌ Gagal mereset Postgres: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    nuke_and_reset()
