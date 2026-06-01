# 🧪 Data Science & MLOps Workspace

Direktori ini berisi kumpulan eksperimen, pemrosesan data historis, dan pengembangan algoritma dasar sebelum diimplementasikan ke dalam REST API (Backend).

## 📄 File Overview

- `scraping.ipynb`: *Script* untuk menarik data artikel mentah dari sumber target. Mengatur *pipeline* pembersihan awal (*data cleansing*).
- `clustering.ipynb`: Eksperimen pemodelan topik tak terawasi (*unsupervised topic modeling*). Di sini kami melakukan kalibrasi parameter **UMAP** (reduksi dimensi) dan **HDBSCAN** pada *pipeline* **BERTopic** untuk mendapatkan matriks klaster yang optimal dari vektor ChromaDB.
- `generation.ipynb`: Modul pengujian *prompt engineering* dan integrasi LLM untuk merangkum atau menghasilkan entitas artikel baru berdasarkan klaster yang terbentuk.

## 🛠️ Persyaratan Lingkungan

Sangat disarankan untuk menggunakan *Virtual Environment* (seperti `.conda` atau `venv`) saat menjalankan *notebook* ini secara lokal untuk menghindari konflik *library*.

```bash
pip install -r requirements.txt