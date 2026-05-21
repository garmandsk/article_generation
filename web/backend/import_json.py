# --- import_json.py ---
import json
from models.models import Article
from config.database import SessionLocal
from config import settings

JSON_FILE_PATH = settings.FILE_CONTENT_PATH # Ganti dengan lokasi file JSON aslimu

def run_migration():
    print(f"Membaca file {JSON_FILE_PATH}...")
    
    try:
        with open(JSON_FILE_PATH, "r", encoding="utf-8") as f:
            articles_data = json.load(f)
    except FileNotFoundError:
        print("❌ File JSON tidak ditemukan. Pastikan jalurnya benar!")
        return

    print(f"📦 Ditemukan {len(articles_data)} artikel di dalam JSON.")
    
    db = SessionLocal()
    try:
        # Tarik semua slug yang sudah ada di database untuk mencegah duplikat
        existing_slugs = set(row[0] for row in db.query(Article.slug).all())
        
        articles_to_insert = []
        
        for item in articles_data:
            slug = item.get("slug")
            
            # Lewati jika artikel sudah ada di database
            if slug in existing_slugs:
                continue
                
            new_article = Article(
                id=item.get("id"),
                id_inc=item.get("id_inc"),
                slug=slug,
                title=item.get("title", ""),
                content=item.get("content", ""),
                tags=item.get("tags", []), 
                
                # 🔥 KUNCI SULAP: Kita set sebagai 'scraped', bukan 'vectorized'
                status="scraped" 
            )
            articles_to_insert.append(new_article)
            
        if articles_to_insert:
            print(f"💾 Memompa {len(articles_to_insert)} artikel ke PostgreSQL...")
            db.bulk_save_objects(articles_to_insert)
            db.commit()
            print("✅ Migrasi sukses!")
        else:
            print("✨ Tidak ada data baru yang ditambahkan. Semua slug sudah ada di database.")

    except Exception as e:
        db.rollback()
        print(f"❌ Terjadi kesalahan fatal saat migrasi: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    run_migration()