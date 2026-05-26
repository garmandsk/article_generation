import json
import time
import asyncio
import re
from google import genai
from pyprojroot import here
from config import settings
from config.database import SessionLocal
from models.models import Article

def client_gemini(api_key, index=2):
    if not api_key:
        return {
            "status_code": 400,
            "status": "fail",
            "message": "api_key not found"
        }
    
    client = genai.Client(api_key=api_key)
    model_list = ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-3-flash-preview", "gemini-3.1-flash-lite-preview"]
    return {
        client,
        model_list[index]
    }

def slugify(text: str) -> str:
    # 1. Ubah ke huruf kecil semua
    text = text.lower()
    # 2. Hapus karakter selain huruf, angka, spasi, dan tanda hubung
    text = re.sub(r'[^a-z0-9\s-]', '', text)
    # 3. Ganti spasi atau tanda hubung beruntun menjadi satu tanda hubung
    text = re.sub(r'[\s-]+', '-', text)
    # 4. Bersihkan tanda hubung di ujung kiri dan kanan jika ada
    return text.strip('-')

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
    ATURAN MUTLAK FORMAT OUTPUT:
    - Kamu WAJIB mengembalikan jawaban HANYA dalam format JSON yang valid.
    - Struktur JSON harus memiliki persis 2 key: "title" dan "content".
    - Key "title" berisi teks judul artikel murni.
    - Key "content" berisi isi artikel dalam format Markdown Dasar yang sangat disederhanakan dengan jumlah kata minimal sebanyak 2000 kata.  

    ATURAN MARKDOWN UNTUK "content":
    - GUNAKAN **teks** untuk menebalkan poin-poin penting.
    - GUNAKAN # atau ## untuk subjudul.
    - GUNAKAN - untuk list bullet poin biasa.
    - DIIZINKAN menggunakan blockquote (>) MAKSIMAL 1 atau 2 kali saja dalam satu artikel (gunakan HANYA untuk menyorot kutipan tokoh atau kesimpulan super penting).
    - DILARANG KERAS menggunakan nested blockquote (>>).
    - DILARANG KERAS menggunakan list bersarang (nested list).
    """

    print(f"🚀 Menerima request dari Web untuk topics: {topics_str}")
    
    try:
        print(f"⏳ Menunggu AI menulis artikel, menggunakan model: {model}")
        # 3. Tembak ke Gemini
        response = client.models.generate_content(
            model=model,
            contents=prompt_system,
            config={"response_mime_type": "application/json"}
        )

        data_article = json.loads(response.text)
        title_article = data_article["title"]
        content_article = data_article["content"]

        print(f"✅ Berhasil! Judul: {title_article}")
        
        return {
            "status_code": 200,
            "status": "success",
            "message": "artikel berhasil dibuat",
            "data": {
                "title": title_article,
                "content": content_article
            }
        }
    except Exception as e:
        return {
            "status_code": 500,
            "status": "error",
            "message": str(e)
        }

async def generate_article(topics, keywords, prompt, model, model_api_key):
    start_time = time.perf_counter()

    # Model Selection
    # client, model = client_gemini(settings.MODEL_GEN_GEMINI_API_KEY, 2)
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

    while try_count <= max_try:
        print(f"🔄 try_count ke-{try_count} dari {max_try}...")
        
        response_generate = await generate_article_from_gemini(client, model, payload)
        
        # Jika sukses (code 200), langsung keluar dari loop!
        if response_generate["status_code"] == 200:
            print("🎉 AI berhasil membuat artikel JSON dengan format yang benar!")
            break
            
        # Jika gagal, tampilkan pesan error-nya
        print(f"⚠️ Gagal pada try_count ke-{try_count}: {response_generate['message']}")
        
        # Tunggu 10 detik sebelum mencoba lagi (jangan jeda jika ini try_count terakhir)
        if try_count < max_try:
            print("⏳ AI sedang bingung (atau server penuh). Menunggu 10 detik sebelum re-roll...\n")
            await asyncio.sleep(10)
            
        try_count += 1

    # --- PENGECEKAN HASIL AKHIR ---
    print("-" * 40)
    if response_generate and response_generate["status_code"] != 200:
        print("❌ GAGAL TOTAL. AI terus-menerus memberikan format yang salah, model sedang high demand, atau server sedang down.")
        print("Saran: Coba periksa kembali API Key, koneksi internet, Ganti model karena sedang high demand, atau sederhanakan Prompt-nya.")
        return {
            "status_code": 400,
            "status": "fail",
            "message": f"❌ GAGAL TOTAL. AI terus-menerus memberikan format yang salah, model sedang high demand, atau server sedang down."
        }

    print("✅ PROSES SELESAI DENGAN SUKSES!")
    # Tampilkan hanya judul untuk memastikan
    print(f"Judul Artikel: {response_generate["data"]["title"]}")

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
            cluster_topic=", ".join(topics)
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
            "message": f"Gagal menyimpan ke database: {str(e)}"
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
        "data": response_generate["data"]
    }