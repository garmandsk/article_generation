# 🚀 Article Generation & MLOps Pipeline

Proyek ini adalah sebuah sistem end-to-end terintegrasi untuk melakukan *scraping*, *clustering* otomatis menggunakan model AI, hingga *generation* artikel baru. Sistem ini menggabungkan lingkungan eksperimen Data Science dengan aplikasi web *Full-Stack* yang di- *deploy* menggunakan Docker.

## 🏗️ System Architecture

Sistem ini menganut arsitektur *Dual-Database* untuk memisahkan data relasional dan vektor dimensional:
- **Relational Database:** PostgreSQL (untuk menyimpan metadata dan status artikel).
- **Vector Database:** ChromaDB (untuk menyimpan *embeddings* dari konten artikel).
- **AI/ML Engine:** BERTopic, UMAP, HDBSCAN (untuk *clustering* cerdas), dan LLM Integration.

## 📁 Repository Structure

- `/notebooks`: Lingkungan Jupyter Notebook untuk riset, eksperimen algoritma, dan *prototyping* MLOps.
- `/web/backend`: REST API menggunakan **FastAPI** untuk melayani model AI dan operasi CRUD database.
- **`/web/frontend`**: Antarmuka pengguna modern berbasis **Next.js** untuk manajemen *pipeline* artikel.

## 🚀 Quick Start (Docker)

Cara tercepat untuk menjalankan keseluruhan sistem secara lokal adalah melalui konfigurasi kontainer yang sudah disediakan.

1. *Clone* repositori ini.
2. Salin `.env.example` menjadi `.env` di *root directory* dan isi parameter kunci (seperti `HF_TOKEN`, `GEMINI_API_KEY`, dll).
3. Siapkan dan Jalankan [Docker](https://docs.docker.com/) / [Docker Desktop](https://docs.docker.com/desktop/)
4. Click 2x file "start.bat" atau Jalankan *script*:
   ```bash
   ./start.bat
   # ATAU secara manual: docker compose up -d --build --wait
5. Akses aplikasi:  
  Frontend UI: http://localhost:8080  
  Backend API Docs: http://localhost:8000/docs