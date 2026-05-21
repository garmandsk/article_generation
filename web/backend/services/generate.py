import json
import time
import asyncio
from google import genai
from pyprojroot import here
from utils import save_generated_article, get_from_json, save_to_json
from config import settings

def client_gemini(api_key, index=2):
    if not api_key:
        return {
            "status_code": 400,
            "status": "fail",
            "message": "api_key or index model not found"
        }
    
    client = genai.Client(api_key=api_key)
    model_list = ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-3-flash-preview", "gemini-3.1-flash-lite-preview"]
    return {
        client,
        model_list[index]
    }

async def generate_article_from_gemini(client, model, payload):
    """
    Fungsi ini dipanggil HANYA ketika user menekan tombol 'Generate' di Web.
    
    Contoh isi payload:
    {
        "selected_topics": ["Kondisi Ekonomi", "Ekonomi"],
        "keywords": ["Ekonomi", "Kondisi Ekonomi", "Biaya Hidup"]
        "prompt": "Fokuskan pada dampak ekonomi sirkular bagi UMKM lokal",
    }
    """
    
    topics_str = " dan ".join(payload["selected_topics"])
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

async def generate_article(selected_topics, keywords, prompt, model, model_api_key):
    # Model Selection
    # client, model = client_gemini(settings.MODEL_GEN_GEMINI_API_KEY, 2)
    client = genai.Client(api_key=model_api_key)
    payload = {
        "selected_topics": selected_topics,
        "keywords": keywords,
        "prompt": prompt,
    }

    print("Cek")
    print(client)
    print(model)
    print(payload)

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
            time.sleep(10)
            
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

    print("Menyimpan artikel")
    await asyncio.to_thread(save_generated_article, response_generate["data"]["title"], response_generate["data"]["content"])
    
    print("Menambah stat generated article")
    metadata_generated_article = await asyncio.to_thread(get_from_json, settings.FILE_METADATA_GENERATED_ARTICLE_PATH)
    metadata_generated_article["total_generated_article"] += 1
    await asyncio.to_thread(save_to_json, settings.FILE_METADATA_GENERATED_ARTICLE_PATH, metadata_generated_article)

    return {
        "status_code": 200,
        "status": "success",
        "message": "artikel berhasil di generate",
        "data": response_generate
    }