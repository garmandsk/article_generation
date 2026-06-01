# 💻 Frontend - Article Manager Dashboard

Antarmuka pengguna interaktif berbasis **Next.js** (React) untuk memantau, memfilter, dan mengeksekusi operasi MLOps (*Scraping, Clustering, Generating*) dengan mulus.

## ✨ Fitur Utama
- **System Overview:** Dasbor untuk memantau kondisi database yang mencakup jumlah artikel, topik dan distribusinya.
- **Storage Overview:** Dasbor untuk melakukan *tracking* 1000+ artikel, lengkap dengan filter status, pencarian dinamis (didukung oleh mekanisme *debounce*), dan Import/Export Article.
- **Scrap Page:** Halaman yang digunakan untuk melakukan scraping dari web tujuan.
- **Cluster Page:** Interaksi Peng-clusteran artikel untuk mendapatkan topik - topik yang berkaitan dengan BERTopic dilakukan di halaman ini.
- **Generate Page**: Pembuatan Artikel secara otomatis dengan gemini dapat dilakukan di halaman ini.  
  CATATAN: Pastikan sudah pernah melakukan clustering agar tercipta rekomendasi topik. Dan, persiapkan model_api_key gemini bisa di cek di [Gemini Documentation](https://ai.google.dev/gemini-api/docs/api-key)

## 🚀 Menjalankan Secara Lokal (Tanpa Docker)

Jika Anda ingin mengembangkan UI tanpa membangun ulang kontainer:

1. Pastikan Node.js terinstal.
2. Masuk ke direktori ini dan instal dependensi:
   ```bash
   cd web/frontend
   pnpm install
3. Mulai server development: 
   ```bash
   pnpm dev  
## Learn More Next.JS

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!