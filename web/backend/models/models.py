# --- models.py ---
import uuid

from sqlalchemy import Boolean, Column, DateTime, Integer, String, Text
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.sql import func

from config.database import Base


class Article(Base):
    __tablename__ = "articles"

    # Jika ID tidak dikirim dari JSON, otomatis buat UUID v4 baru berbentuk string
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    id_inc = Column(Integer, unique=True, index=True)
    slug = Column(String, unique=True, index=True, nullable=False)
    title = Column(String, nullable=True)
    content = Column(Text, nullable=True)
    tags = Column(ARRAY(String), nullable=True, server_default="{}")
    published_at = Column(DateTime(timezone=True), nullable=True)

    # Status pipeline: 'scraped', 'clustered', atau 'generated'
    status = Column(String, default="slug_only", nullable=False)

    # Kolom opsional untuk menampung label topik setelah proses clustering AI sukses
    cluster_topic = Column(String, nullable=True)
    cluster_keywords = Column(ARRAY(String), nullable=True, server_default="{}")
    is_recommended = Column(Boolean, default=False, nullable=False)

    # Timestamp otomatis waktu data masuk ke database
    created_at = Column(DateTime(timezone=True), server_default=func.now())
