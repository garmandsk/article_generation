import asyncio
import json
import time
import uuid

from google import genai
from slugify import slugify
from sqlalchemy.exc import IntegrityError

from config.database import SessionLocal
from models.models import Article
from utils import log_msg  # Pastikan ini di-import


def generate_slug(title: str) -> str:
    safe_slug = slugify(title, allow_unicode=True)

    if not safe_slug:
        safe_slug = f"article-{uuid.uuid4().hex[:8]}"

    return safe_slug


# Kita gabungkan fungsi pemanggilan dan orkestrasinya menjadi satu Generator Stream
async def generate_article_stream(payload):
    start_time = time.perf_counter()
    yield log_msg("🚀 Memulai proses Generate Artikel...", 5)

    topics = payload.topics
    prompt_system = payload.prompt_system
    prompt_user = payload.prompt_user
    model = payload.model
    model_api_key = payload.model_api_key

    prompt = prompt_system
    if prompt_user:
        prompt += f"\n\nINSTRUKSI KHUSUS DARI PENGGUNA:\n{prompt_user}"

    yield log_msg("💬 Prompt anda...", 10)
    yield log_msg(prompt)
    yield log_msg("🔑 Memvalidasi kredensial Gemini SDK...", 10)
    if not model_api_key:
        yield log_msg("❌ API Key tidak ditemukan!", status="error")
        return

    client = genai.Client(api_key=model_api_key)

    max_try = 5
    try_count = 1
    response_generate = None

    while try_count <= max_try:
        yield log_msg(
            f"🔄 Mengirim prompt ke Gemini (Percobaan {try_count}/{max_try})...",
            15 + (try_count * 5),
        )

        try:
            # Gunakan 'client.aio' agar proses nunggu tidak memblokir server!
            response = await client.aio.models.generate_content(
                model=model,
                contents=prompt,
                config={"response_mime_type": "application/json"},
            )

            data_article = json.loads(response.text)
            title_article = data_article["title"]
            content_article = data_article["content"]

            yield log_msg(
                f"✅ Berhasil! AI telah merangkai {len(content_article.split())} kata.",
                70,
            )
            yield log_msg(f"📝 Judul: {title_article}", 75)

            response_generate = {
                "status_code": 200,
                "data": {"title": title_article, "content": content_article},
            }
            break

        except Exception as e:
            error_msg = str(e)
            if "API_KEY_INVALID" in error_msg or "400" in error_msg:
                yield log_msg(
                    "❌ API Key tidak valid atau tidak ditemukan.", status="error"
                )
                return
            elif "quota" in error_msg.lower() or "429" in error_msg:
                yield log_msg(
                    "❌ Kuota API habis atau melampaui batas (Rate Limit).",
                    status="error",
                )
                return

            print(f"⚠️ Gagal (Kemungkinan Hallucination / JSON rusak): {error_msg}")
            yield log_msg(
                "⚠️ Gagal (Kemungkinan Hallucination / JSON rusak)",
                20 + (try_count * 5),
            )

            if try_count < max_try:
                yield log_msg(
                    "⏳ AI sedang menata ulang "
                    "memori. Menunggu 10 detik sebelum re-roll...",
                    25 + (try_count * 5),
                )
                await asyncio.sleep(10)

            try_count += 1

    if not response_generate or response_generate["status_code"] != 200:
        yield log_msg(
            "❌ GAGAL TOTAL menulis artikel setelah 5 percobaan.", status="error"
        )
        return

    # Menyimpan Artikel
    yield log_msg("💾 Menyimpan artikel ke database PostgreSQL...", 85)
    db = SessionLocal()
    try:
        generated_title = response_generate["data"]["title"]
        generated_slug = generate_slug(generated_title)

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

        yield log_msg(f"✅ Artikel tersimpan permanen dengan ID: {new_article.id}", 95)
    except IntegrityError as e:
        db.rollback()
        print(f"Database Error: {str(e)}")
        yield log_msg(
            "❌ Gagal menyimpan artikel. Judul mungkin sudah digunakan "
            "atau terjadi masalah format.",
            status="error",
        )
    except Exception as e:
        db.rollback()
        print(f"Kesalahan tidak terduga saat menyimpan data: {e}")
        yield log_msg("❌ Kesalah tidak terduga saat menyimpan data", status="error")
        return
    finally:
        db.close()

    end_time = time.perf_counter()
    exec_time_sec = str(round(end_time - start_time)) + "s"

    final_result = {
        "status_code": 200,
        "status": "success",
        "message": "Artikel berhasil di-generate oleh AI.",
        "exec_time": exec_time_sec,
        "data": response_generate["data"],
    }

    # Sinyal Selesai untuk Frontend
    yield {
        "status": "done",
        "text": final_result["message"],
        "step": 100,
        "total": 100,
        "result": final_result,
    }
