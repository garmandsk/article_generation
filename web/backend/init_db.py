from config.database import engine, Base
from models.models import Article 

def create_tables():
    print("Mencoba terhubung ke PostgreSQL...")
    
    # Perintah sakti untuk membuat semua tabel yang ada di file models.py
    # Jika tabel sudah ada, perintah ini tidak akan melakukan apa-apa (aman).
    # Jika tabel belum ada, ia akan membuatnya.
    Base.metadata.create_all(bind=engine)
    
    print("✅ Berhasil! Tabel 'articles' (dan lainnya) sudah tercipta di database.")

if __name__ == "__main__":
    create_tables()