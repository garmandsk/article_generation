import asyncio
import time

import httpx
from sqlalchemy.orm import Session

from config import settings
from config.database import SessionLocal
from models.models import Article
from utils import (
    generate_and_save_embeddings_to_db,
    log_msg,
    parse_time,
)


async def scrap_newer_list_articles(
    headers, max_scrap, overlap_limit, page, limit_article_per_page
):
    yield log_msg("\nMemulai pencarian artikel baru...", 2)

    db: Session = SessionLocal()
    try:
        existing_ids = set(row[0] for row in db.query(Article.id_inc).all())
        if not len(existing_ids) > 0:
            yield log_msg("📌 File ada, tapi isinya list kosong. mulai dari 0", 3)

        newer_articles_batch = []
        # overlap_limit = 100
        overlap_counter = 0
        i = 1
        # page = 15
        # limit = 10
        # max_scrap = 10
        stop_scrap = False

        yield log_msg(
            f"Mulai dari page: {page}, Limit data setiap page: "
            f"{limit_article_per_page}",
            5,
        )

        async with httpx.AsyncClient() as client:
            while not stop_scrap:
                yield log_msg(
                    f"\n📄 Membuka Halaman {page}...", 5 + int((i / max_scrap) * 5)
                )

                params_list = {"page": page, "limit": limit_article_per_page}
                try:
                    response_list = await client.get(
                        settings.URL_ARTICLE_LIST, params=params_list, headers=headers
                    )

                    if response_list.status_code != 200:
                        yield log_msg(
                            f"❌ Gagal buka halaman {page}. Status: "
                            f"{response_list.status_code}",
                            status="error",
                        )
                        break

                    data_list = response_list.json().get("data", {}).get("contents", [])
                    if not data_list:
                        yield log_msg(
                            "🛑 Halaman kosong! Kita sudah mencapai zaman purba.", 15
                        )
                        break

                    for article in data_list:
                        id_inc_current = article["id_inc"]

                        # SKENARIO A: Artikel SUDAH ADA di lokal
                        if id_inc_current in existing_ids:
                            overlap_counter += 1
                            if overlap_counter >= overlap_limit:
                                yield log_msg(
                                    f"🛑 Menyentuh dasar data lama "
                                    f"({overlap_limit} beruntun). "
                                    "Tarik rem darurat!",
                                    15,
                                )
                                stop_scrap = True
                                break
                            continue

                        # SKENARIO B: Artikel BARU atau GAP
                        overlap_counter = 0
                        new_item = Article(
                            id=article["id"],
                            id_inc=id_inc_current,
                            slug=article["slug"],
                            published_at=parse_time(article["published_at_time"]),
                            status="slug_only",
                        )
                        newer_articles_batch.append(new_item)

                        # Kalkulasi progress (15% sampai 35%)
                        current_step = 15 + int((i / max_scrap) * 20)
                        yield log_msg(
                            f"➕ Dapat artikel {i}/{max_scrap} "
                            f"(Baru/Gap): {article['slug']}",
                            current_step,
                        )
                        i += 1

                        # SKENARIO C: KUOTA HABIS
                        if i > max_scrap:
                            yield log_msg(
                                f"🛑 Kuota habis ({max_scrap}). "
                                f"Sisa gap dilanjut besok!",
                                35,
                            )
                            stop_scrap = True
                            break

                except Exception as e:
                    print(f"Gangguan jaringan pada halaman {page}: {e}")
                    yield log_msg(f"⚠️ Gangguan jaringan pada halaman {page}")
                    break

                last_page = page
                page += 1
                await asyncio.sleep(2)

            if newer_articles_batch:
                yield log_msg(
                    f"💾 Menyimpan {len(newer_articles_batch)} "
                    f"slug baru ke PostgreSQL...",
                    35,
                )
                db.bulk_save_objects(newer_articles_batch)
                db.commit()

        # Gunakan dict khusus untuk mengembalikan nilai akhir (Bukan untuk UI Frontend)
        yield {
            "type": "result",
            "status_code": 200,
            "status": "success",
            "scrap_count": len(newer_articles_batch),
            "last_page": last_page,
        }

    finally:
        db.close()


async def scrap_older_list_articles(headers, max_scrap, limit_article_per_page):
    yield log_msg("\nMemulai pencarian artikel jadul...", 2)

    db: Session = SessionLocal()
    try:
        existing_ids = set(row[0] for row in db.query(Article.id_inc).all())

        if not existing_ids:
            yield {
                "type": "result",
                "status_code": 400,
                "message": "Database lokalmu masih kosong!",
            }
            return

        older_articles_batch = []
        # limit = 10
        i = 1
        estimation = len(existing_ids) // 10
        page = 1 if (estimation - 2) <= 0 else (estimation - 2)
        max_page = page + 100
        # max_scrap = 10
        # visited_page = 1
        stop_scrap = False

        yield log_msg(
            f"Mulai dari page: {page}, Limit data: {limit_article_per_page}", 5
        )

        async with httpx.AsyncClient() as client:
            while not stop_scrap and page <= max_page:
                params_list = {"page": page, "limit": limit_article_per_page}
                try:
                    response_list = await client.get(
                        settings.URL_ARTICLE_LIST, params=params_list, headers=headers
                    )

                    if response_list.status_code != 200:
                        yield log_msg(
                            f"❌ Gagal buka halaman {page}. Status: "
                            f"{response_list.status_code}",
                            status="error",
                        )
                        break

                    data_list = response_list.json().get("data", {}).get("contents", [])
                    if not data_list:
                        yield log_msg(
                            "🛑 Halaman kosong! Kita sudah mencapai zaman purba.", 15
                        )
                        break

                    yield log_msg(
                        f"⛏️ Mulai menggali di Halaman {page}...",
                        5 + int((i / max_scrap) * 5),
                    )

                    for article in data_list:
                        id_inc_current = article["id_inc"]
                        if id_inc_current not in existing_ids:
                            new_item = Article(
                                id=article["id"],
                                id_inc=id_inc_current,
                                slug=article["slug"],
                                published_at=parse_time(article["published_at_time"]),
                                status="slug_only",
                            )
                            older_articles_batch.append(new_item)

                            current_step = 15 + int((i / max_scrap) * 20)
                            yield log_msg(
                                f"➕ Dapat fosil article baru "
                                f"{i}/{max_scrap}: {article['slug']}",
                                current_step,
                            )
                            i += 1

                            if i > max_scrap:
                                yield log_msg(
                                    f"🛑 Kuota habis ({max_scrap}). "
                                    "Sisa fosil dilanjut besok!",
                                    35,
                                )
                                stop_scrap = True
                                break
                except Exception as e:
                    print(f"Error di halaman {page}: {e}")
                    yield log_msg(f"⚠️ Error di halaman {page}")
                    break

                last_page = page
                page += 1
                await asyncio.sleep(2)

            yield log_msg(
                f"\n🎉 Berhasil menggali {len(older_articles_batch)} "
                "article masa lalu!",
                35,
            )

            if older_articles_batch:
                yield log_msg(
                    f"💾 Menyimpan {len(older_articles_batch)} "
                    "slug fosil ke PostgreSQL...",
                    35,
                )
                db.bulk_save_objects(older_articles_batch)
                db.commit()

        yield {
            "type": "result",
            "status_code": 200,
            "status": "success",
            "scrap_count": len(older_articles_batch),
            "last_page": last_page,
        }

    finally:
        db.close()


async def scrap_content_articles(headers):
    yield log_msg("\n⚡ [Postgres] Memulai penarikan konten penuh (Asinkronus)...", 40)

    db: Session = SessionLocal()
    try:
        queue_articles = db.query(Article).filter(Article.status == "slug_only").all()

        if not queue_articles:
            yield log_msg(
                "✅ Semua list artikel di database sudah memiliki konten penuh.", 80
            )
            yield {"type": "result", "status_code": 200, "downloaded_count": 0}
            return

        total_queue = len(queue_articles)
        yield log_msg(
            f"📋 Ditemukan {total_queue} antrean artikel yang siap ditarik.", 45
        )

        i = 1
        downloaded_count = 0

        async with httpx.AsyncClient() as client:
            for article in queue_articles:
                slug = article.slug
                url_article_content_final = (
                    f"{settings.URL_ARTICLE_CONTENT.rstrip('/')}/{slug}"
                )

                try:
                    response_content = await client.get(
                        url_article_content_final, headers=headers
                    )

                    if response_content.status_code != 200:
                        yield log_msg(
                            f"❌ Gagal mengambil {slug} (Status: "
                            f"{response_content.status_code})",
                            45,
                        )
                        await asyncio.sleep(2)
                        continue

                    data = response_content.json().get("data", {})
                    if not data:
                        yield log_msg(
                            f"⚠️ Melewati {slug}: Isinya kosong dari server.", 45
                        )
                        continue

                    article.title = data.get("title", "Untitled")
                    article.content = data.get("article", "")
                    article.status = "scraped"

                    # Kalkulasi Progress bar dari 45% ke 80%
                    current_step = 45 + int((i / total_queue) * 35)
                    yield log_msg(
                        f"✅ [{i}/{total_queue}] Sukses menyedot konten: {slug}",
                        current_step,
                    )

                    downloaded_count += 1
                    i += 1
                except Exception as e:
                    print(f"Error tak terduga pada {slug}: {e}")
                    yield log_msg(f"⚠️ Error tak terduga pada {slug}")

                await asyncio.sleep(2)

            if downloaded_count > 0:
                yield log_msg("💾 Mengunci perubahan konten ke PostgreSQL...", 80)
                db.commit()

        yield {
            "type": "result",
            "status_code": 200,
            "downloaded_count": downloaded_count,
        }
    finally:
        db.close()


async def scrap_articles_stream(payload, token):
    start_time = time.perf_counter()
    headers = settings.BASE_HEADERS.copy()
    headers["Authorization"] = f"Bearer {token}"
    details_scrap = {
        "newer_article": 0,
        "older_article": 0,
        "last_page_newer_article": 0,
        "last_page_older_article": 0,
    }

    mode = payload.mode
    max_scrap = payload.max_scrap
    overlap_limit = payload.overlap_limit
    page = payload.page
    limit_article_per_page = payload.limit_article_per_page

    try:
        # TAHAP 1: Scraping List
        if mode == "newer" or mode == "both":  # Asumsi both untuk else
            async for evt in scrap_newer_list_articles(
                headers, max_scrap, overlap_limit, page, limit_article_per_page
            ):
                if evt.get("type") == "result":
                    details_scrap["newer_article"] = evt["scrap_count"]
                    details_scrap["last_page_newer_article"] = evt["last_page"]
                else:
                    if mode == "both" and "step" in evt:
                        # Skala dari 0-35% menjadi 0-17% agar tidak bentrok dengan older
                        evt["step"] = int(evt["step"] / 2)

                    yield evt

        if mode == "older" or mode == "both":
            async for evt in scrap_older_list_articles(
                headers, max_scrap, limit_article_per_page
            ):
                if evt.get("type") == "result":
                    details_scrap["older_article"] = evt["scrap_count"]
                    details_scrap["last_page_older_article"] = evt["last_page"]
                else:
                    if mode == "both" and "step" in evt:
                        # Skala dari 0-35% menjadi 0-17% agar tidak bentrok dengan older
                        evt["step"] = 18 + int(evt["step"] / 2)

                    yield evt

        # TAHAP 2: Scraping Konten
        async for evt in scrap_content_articles(headers):
            if evt.get("type") == "result":
                pass  # Bisa simpan downloaded_count jika perlu
            else:
                yield evt

        # TAHAP 3: Sinkronisasi pgvector
        yield log_msg("Memasukkan data ke Vector Database (pgvector)", 85)
        db: Session = SessionLocal()
        try:
            unsynced_articles = (
                db.query(Article)
                .filter(
                    Article.status.in_(
                        ["scraped", "vectorized", "clustered", "outlier_cluster"]
                    )
                )
                .all()
            )
            if unsynced_articles:
                yield log_msg(
                    f"🔄 Sinkronisasi {len(unsynced_articles)} artikel ke ChromaDB...",
                    90,
                )

                lean_data_for_vector = [
                    {
                        "id": art.id,
                        "title": art.title or "",
                        "content": art.content or "",
                        "tags": [],
                    }
                    for art in unsynced_articles
                ]

                # Offload tugas AI berat agar tidak memblokir loop Stream
                await asyncio.to_thread(
                    generate_and_save_embeddings_to_db, lean_data_for_vector
                )

                yield log_msg(
                    "✅ Sinkronisasi Postgres -> pgvector selesai sempurna.", 95
                )
            else:
                yield log_msg(
                    "✅ Seluruh data Postgres dan pgvector sudah sinkron.", 95
                )

        finally:
            total_list = db.query(Article).count()
            total_content = (
                db.query(Article).filter(Article.status != "slug_only").count()
            )
            total_vectorized = (
                db.query(Article)
                .filter(
                    Article.status.in_(
                        ["vectorized", "clustered", "outlier_cluster", "generated"]
                    )
                )
                .count()
            )
            db.close()

        end_time = time.perf_counter()
        exec_time_sec = str(round(end_time - start_time)) + "s"

        final_result = {
            "status_code": 200,
            "status": "success",
            "message": f"Pipeline selesai dalam {exec_time_sec}.",
            "data": {
                "details_scrap": details_scrap,
                "mode": mode,
                "system_health": {
                    "total_list": total_list,
                    "total_content": total_content,
                    "total_chromadb": total_vectorized,
                },
            },
            "exec_time": exec_time_sec,
        }

        yield {
            "status": "done",
            "text": final_result["message"],
            "step": 100,
            "total": 100,
            "result": final_result,
        }

    except Exception as e:
        print(f"Kesalahan tidak terduga saat scraping artikel: {e}")
        yield log_msg(
            "❌ Kesalahan tidak terduga saat scraping artikel", status="error"
        )
