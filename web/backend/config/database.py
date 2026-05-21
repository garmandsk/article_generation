import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Muat file .env
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError("DATABASE_URL tidak ditemukan di file .env!")

# Buat engine koneksi ke PostgreSQL
engine = create_engine(DATABASE_URL)

# Buat pabrik sesi (session factory) untuk operasi CRUD nanti
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class untuk cetak biru (model) tabel database
Base = declarative_base()

# Dependency untuk FastAPI agar sesi database otomatis tertutup setelah selesai digunakan
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()