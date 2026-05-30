import asyncio
import json
import re
import time

from google import genai

from config.database import SessionLocal
from models.models import Article


def client_gemini(api_key, index=2):
    if not api_key:
        return {"status_code": 400, "status": "fail", "message": "api_key not found"}

    client = genai.Client(api_key=api_key)
    model_list = [
        "gemini-2.5-flash",
        "gemini-2.5-flash-lite",
        "gemini-3-flash-preview",
        "gemini-3.1-flash-lite-preview",
    ]
    return {client, model_list[index]}


def slugify(text: str) -> str:
    # 1. Ubah ke huruf kecil semua
    text = text.lower()
    # 2. Hapus karakter selain huruf, angka, spasi, dan tanda hubung
    text = re.sub(r"[^a-z0-9\s-]", "", text)
    # 3. Ganti spasi atau tanda hubung beruntun menjadi satu tanda hubung
    text = re.sub(r"[\s-]+", "-", text)
    # 4. Bersihkan tanda hubung di ujung kiri dan kanan jika ada
    return text.strip("-")


async def generate_article_from_gemini(client, model, payload):
    """
    Fungsi ini dipanggil HANYA ketika user menekan tombol 'Generate' di Web.

    Contoh isi payload:
    {
        "topics": ["Kondisi Ekonomi", "Ekonomi"],
        "keywords": ["Ekonomi", "Kondisi Ekonomi", "Biaya Hidup"]
        "prompt": "Fokuskan pada dampak ekonomi sirkular bagi UMKM lokal",
    }
    """

    topics_str = " dan ".join(payload["topics"])
    keywords_str = ", ".join(payload["keywords"])
    prompt_user = payload.get("prompt", "")

    # 1. Rakit Prompt Utama
    prompt_system = f"""
    Bertindaklah sebagai Jurnalis atau pembuat artikel yang ahli.
    Tuliskan 1 artikel edukasi berdasarkan informasi berikut:
    - topics Utama: {topics_str}
    - Kata Kunci yang WAJIB dibahas: {keywords_str}
    """

    # 2. Suntikkan Request Opsional dari Pengguna (Jika Ada)
    if prompt_user:
        prompt_system += f"\n\nINSTRUKSI KHUSUS DARI PENGGUNA:\n{prompt_user}"

    prompt_system += """\n\n
    ATURAN MUTLAK FORMAT OUTPUT: - Kamu WAJIB mengembalikan jawaban HANYA dalam
    format JSON yang valid. - Struktur JSON harus memiliki persis 2 key: "title"
    dan "content". - Key "title" berisi teks judul artikel murni. - Key
    "content" berisi isi artikel dalam format Markdown Dasar yang sangat
    disederhanakan dengan jumlah kata minimal sebanyak 2000 kata.

    ATURAN MARKDOWN UNTUK "content": - GUNAKAN **teks** untuk menebalkan
    poin-poin penting. - GUNAKAN # atau ## untuk subjudul. - GUNAKAN - untuk
    list bullet poin biasa. - DIIZINKAN menggunakan blockquote (>) MAKSIMAL 1
    atau 2 kali saja dalam satu artikel (gunakan HANYA untuk menyorot kutipan
    tokoh atau kesimpulan super penting). - DILARANG KERAS menggunakan nested
    blockquote (>>). - DILARANG KERAS menggunakan list bersarang (nested list).
    """

    print(f"🚀 Menerima request dari Web untuk topics: {topics_str}")

    try:
        print(f"⏳ Menunggu AI menulis artikel, menggunakan model: {model}")
        # 3. Tembak ke Gemini
        response = client.models.generate_content(
            model=model,
            contents=prompt_system,
            config={"response_mime_type": "application/json"},
        )

        data_article = json.loads(response.text)
        title_article = data_article["title"]
        content_article = data_article["content"]

        print(f"✅ Berhasil! Judul: {title_article}")

        return {
            "status_code": 200,
            "status": "success",
            "message": "artikel berhasil dibuat",
            "data": {"title": title_article, "content": content_article},
        }
    except Exception as e:
        error_msg = str(e)

        status_code = 500  # Default Server Error
        if (
            "API_KEY_INVALID" in error_msg
            or "400" in error_msg
            or "API key not valid" in error_msg
        ):
            status_code = 401  # Unauthorized
            error_msg = "API Key tidak valid atau tidak ditemukan."
        elif "quota" in error_msg.lower() or "429" in error_msg:
            status_code = 429  # Too Many Requests
            error_msg = "Kuota API habis atau melampaui batas request (Rate Limit)."

        return {
            "status_code": status_code,
            "status": "error",
            "message": error_msg,  # Kirim pesan yang sudah diterjemahkan
        }


async def generate_article(payload):
    start_time = time.perf_counter()

    # Pembongkaran payload
    topics = payload.topics
    keywords = payload.keywords
    prompt = payload.prompt
    model = payload.model
    model_api_key = payload.model_api_key

    client = genai.Client(api_key=model_api_key)
    payload = {
        "topics": topics,
        "keywords": keywords,
        "prompt": prompt,
    }

    # print("Cek")
    # print(client)
    # print(model)
    # print(payload)

    max_try = 5
    try_count = 1
    response_generate = None

    while try_count <= max_try:
        print(f"🔄 try_count ke-{try_count} dari {max_try}...")

        response_generate = await generate_article_from_gemini(client, model, payload)
        print(f"response_generate: {response_generate}")

        # Jika sukses (code 200), langsung keluar dari loop!
        if response_generate["status_code"] == 200:
            print("🎉 AI berhasil membuat artikel JSON dengan format yang benar!")
            break

        # Cek error api key salah/kuota habis
        if response_generate["status_code"] in [401, 429]:
            print(f"🛑 FATAL ERROR: {response_generate['message']}")
            break

        # Jika gagal, tampilkan pesan error-nya
        print(f"⚠️ Gagal pada try_count ke-{try_count}: {response_generate['message']}")

        # Tunggu 10 detik sebelum mencoba lagi (jangan jeda jika ini try_count terakhir)
        if try_count < max_try:
            print(
                "⏳ AI sedang bingung (atau server penuh). "
                "Menunggu 10 detik sebelum re-roll...\n"
            )
            await asyncio.sleep(10)

        try_count += 1

    # --- PENGECEKAN HASIL AKHIR ---
    print("-" * 40)
    if response_generate and response_generate["status_code"] != 200:
        print("❌ GAGAL TOTAL.")

        end_time = time.perf_counter()
        exec_time_sec = str(round(end_time - start_time)) + "s"

        return {
            "status_code": response_generate["status_code"]
            if response_generate
            else 500,
            "status": "fail",
            "message": response_generate["message"]
            if response_generate
            else "Terjadi kesalahan internal (Unknown Error)",
            "exec_time": exec_time_sec,
        }

    print("✅ PROSES SELESAI DENGAN SUKSES!")
    # Tampilkan hanya judul untuk memastikan
    print(f"Judul Artikel: {response_generate['data']['title']}")

    # Menyimpan Artikel
    print("💾 Menyimpan artikel ke database PostgreSQL...")
    db = SessionLocal()
    try:
        generated_title = response_generate["data"]["title"]
        generated_slug = slugify(generated_title)

        new_article = Article(
            slug=generated_slug,
            title=generated_title,
            content=response_generate["data"]["content"],
            status="generated",
            cluster_topic=", ".join(topics),
        )

        db.add(new_article)
        db.commit()
        db.refresh(new_article)

        print(f"✅ Artikel disimpan dengan ID Database: {new_article.id}")
    except Exception as e:
        db.rollback()
        db.rollback()
        print(f"❌ Gagal menyimpan ke database PostgreSQL: {e}")
        return {
            "status_code": 500,
            "status": "error",
            "message": f"Gagal menyimpan ke database: {str(e)}",
        }
    finally:
        db.close()

    end_time = time.perf_counter()
    exec_time_sec = str(round(end_time - start_time)) + "s"

    return {
        "status_code": 200,
        "status": "success",
        "message": "artikel berhasil di generate",
        "exec_time": exec_time_sec,
        "data": response_generate["data"],
    }
