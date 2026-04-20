#!/bin/bash

echo "🚀 Memulai Setup Environment Data Science..."

# 1. Install tool pembuat requirements
pip install pipreqs pipreqsnb

# 2. Generate requirements.txt 
# (WAJIB: Abaikan folder environment agar file-nya bersih!)
pipreqsnb . --force --ignore .conda,venv,env,.venv,.git

# 4. Install semua library sekaligus dari daftar yang sudah bersih
echo "📦 Menginstal seluruh library..."
pip install -r requirements.txt

echo "✅ Setup Selesai! Environment siap digunakan."