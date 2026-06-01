# =========================================
# Stage 1: Builder (Mesin Tukang Rakit)
# =========================================
FROM python:3.11-slim AS builder

# Install alat pertukangan (compiler C++) dan file header database
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Membuat 'koper' Virtual Environment di dalam folder /opt/venv
RUN python -m venv /opt/venv

# Mengaktifkan Virtual Environment agar pip install masuk ke dalam koper ini
ENV PATH="/opt/venv/bin:$PATH"

# Salin HANYA daftar belanjaan
COPY ./requirements.txt .

# Install semua library ke dalam Virtual Environment
# --no-cache-dir membuang sampah sisa unduhan agar koper tidak berat
RUN pip install --no-cache-dir --upgrade pip && \
    pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu && \
    pip install --no-cache-dir -r requirements.txt


# =========================================
# Stage 2: Runner (Mesin Produksi Bersih)
# =========================================
FROM python:3.11-slim AS runner

WORKDIR /backend

ENV PYTHONBUFFERED=1

# menginstal libpq5 (runtime)
RUN apt-get update && apt-get install -y \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

# BARIS MAGIS: Membawa koper 'venv' yang sudah berisi library matang 
# dari mesin builder ke mesin runner
COPY --from=builder /opt/venv /opt/venv

# Mengaktifkan Virtual Environment di mesin baru ini
ENV PATH="/opt/venv/bin:$PATH"

# Baru salin seluruh kode utamamu (main.py, routers, dll)
COPY . .

EXPOSE 8000

CMD ["fastapi", "run"]