# ⚙️ Backend - FastAPI & AI Engine

Jantung dari operasi logika dan pemrosesan data berbeban tinggi. Dibangun menggunakan **FastAPI**, *backend* ini melayani operasi asinkron untuk berinteraksi dengan database relasional (PostgreSQL) dan database vektor (ChromaDB), serta memuat *pipeline* model bahasa.

## 🧠 Core Technologies
- **FastAPI:** *Framework* web super cepat untuk membangun RESTful API dan koneksi *streaming* (SSE).
- **SQLAlchemy:** ORM untuk pemetaan skema tabel `Article` ke PostgreSQL.
- **ChromaDB:** Penyimpanan *embeddings* vektor lokal untuk pencarian semantik.
- **BERTopic:** Framework klastering dinamis yang dikalibrasi untuk mencegah *error* populasi data minimal (*adaptive neighbors*).

## 🔒 Manajemen Data
- Terdapat metode proteksi sinkronisasi antara PostgreSQL dan ChromaDB (menghindari duplikasi vektor).
- Operasi `import` dan `export` database divalidasi dan diisolasi dengan ketat.

## 🚀 Menjalankan Secara Lokal (Tanpa Docker)

Jika Anda ingin menguji API atau model AI secara langsung:

1. Pastikan Python 3.11+ terinstal (Rec: 3.11/3.12).
2. Instal dependensi:
   ```bash
   cd web/backend
   pip install -r requirements.txt
3. Pastikan service PostgreSQL dan ChromaDB Anda (jika terpisah) sudah berjalan. Sesuaikan DATABASE_URL di dalam file .env.
4. Mulai server:  
   ```bash
   fastapi dev
   # or
   python -m fastapi dev
## 📚 Further Reading & References

Sistem *backend* ini dibangun di atas tumpukan teknologi modern yang sangat direkomendasikan untuk didalami jika Anda tertarik memasuki dunia **Cloud Engineering**, **Data Science**, dan **MLOps**. 

Berikut adalah dokumentasi resmi dari teknologi inti yang menopang arsitektur ini:

### 🌐 Core Framework & Database
- **[FastAPI Official Guide](https://fastapi.tiangolo.com/learn/)** — Pelajari fondasi bagaimana kami membangun REST API asinkron yang sangat cepat, aman, dan mendukung *Server-Sent Events* (SSE).
- **[SQLAlchemy 2.0 Docs](https://docs.sqlalchemy.org/en/20/)** — Dokumentasi komprehensif mengenai *Object Relational Mapper* (ORM) yang kami gunakan untuk menjembatani logika Python dengan PostgreSQL.
- **[ChromaDB Documentation](https://docs.trychroma.com/getting-started)** — Panduan interaktif tentang bagaimana *Vector Database* bekerja di belakang layar untuk menyimpan dan mencari *embeddings* semantik artikel.

### 🧠 AI & Machine Learning Pipeline
- **[BERTopic Quickstart](https://maartengr.github.io/BERTopic/getting_started/quickstart/quickstart.html)** — Tutorial lengkap tentang algoritma pemodelan topik tak terawasi (*unsupervised*) yang menjadi otak utama *clustering* sistem ini.
- **[Understanding UMAP](https://umap-learn.readthedocs.io/en/latest/how_umap_works.html)** — Penjelasan matematis namun intuitif tentang bagaimana kami memampatkan vektor teks berdimensi tinggi tanpa kehilangan struktur maknanya.
- **[How HDBSCAN Works](https://hdbscan.readthedocs.io/en/latest/how_hdbscan_works.html)** — Artikel luar biasa untuk memahami bagaimana algoritma berbasis kepadatan (*density-based*) mengelompokkan artikel dan memisahkan *noise* (data pencilan).