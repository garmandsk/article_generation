import asyncio
import time
import httpx
from sqlalchemy.orm import Session

from config import settings
from config.database import SessionLocal  
from models.models import Article         
from utils import save_to_chromadb

async def scrap_newer_list_articles(headers, max_scrap, overlap_limit, page, limit_article_per_page):
    print("\nMemulai pencarian artikel baru...")

    db: Session = SessionLocal()
    try:
        existing_ids = set(row[0] for row in db.query(Article.id_inc).all())
        if not len(existing_ids) > 0:
            print("📌 File ada, tapi isinya list kosong. mulai dari 0")

        newer_articles_batch = []
        # overlap_limit = 100
        overlap_counter = 0
        i = 1
        # page = 15
        # limit = 10
        # max_scrap = 10

        stop_scrap = False

        print("Mulai menjelajahi data terbaru - lokal")
        print(f"Mulai dari page: {page}, Limit data setiap page: {limit_article_per_page}")
        async with httpx.AsyncClient() as client:
            while not stop_scrap:
                print(f"\n📄 Membuka Halaman {page}...")

                params_list = {
                    "page": page,
                    "limit": limit_article_per_page
                }

                try:
                    # Versi sinkronus
                    # response_list = requests.get(settings.URL_ARTICLE_LIST, params=params_list, headers=headers)

                    # Versi asinkronus
                    response_list = await client.get(settings.URL_ARTICLE_LIST, params=params_list, headers=headers)
                    # print(f"response_list\n {response_list.json()}")

                    if response_list.status_code != 200:
                        print("❌ Gagal buka halaman {page}. Status: {response_list.status_code}")
                        break

                    data_list = response_list.json().get("data", {}).get("contents", [])
                    if not data_list:
                        print("🛑 Halaman kosong! Kita sudah mencapai zaman purba (artikel pertama di server).")
                        break

                    for article in data_list:
                        id_inc_current = article["id_inc"]

                        # SKENARIO A: Artikel SUDAH ADA di lokal
                        if id_inc_current in existing_ids:
                            overlap_counter += 1

                            if overlap_counter >= overlap_limit:
                                print(f"🛑 Menyentuh dasar data lama ({overlap_limit} beruntun). Tarik rem darurat!")
                                stop_scrap = True # Beri sinyal agar Loop Luar juga ikut berhenti
                                break # Hentikan Loop Dalam
                            continue

                        # SKENARIO B: Artikel BARU atau GAP
                        overlap_counter = 0

                        new_item = Article(
                            id=article["id"],
                            id_inc=id_inc_current,
                            slug=article["slug"],
                            status="slug_only"
                        )
                        newer_articles_batch.append(new_item)

                        print(f"➕ Dapat artikel {i}/{max_scrap} (Baru/Gap): {article['slug']}")

                        i += 1

                        # SKENARIO C: KUOTA HABIS
                        if i > max_scrap:
                            print(f"🛑 Kuota habis ({max_scrap}). Sisa gap dilanjut besok!")
                            stop_scrap = True
                            break
                except Exception as e:
                    print(f"⚠️ Gangguan jaringan pada halaman {page}: {e}")
                    break

                page += 1
                await asyncio.sleep(5)

            # Simpan massal (Bulk Save) objek-objek baru ke PostgreSQL
            if newer_articles_batch:
                print(f"💾 Menyimpan {len(newer_articles_batch)} slug baru ke PostgreSQL...")
                db.bulk_save_objects(newer_articles_batch)
                db.commit()
            
        return {
            "status_code": 200,
            "status": "success",
            "message": "berhasil menggali artikel baru",
            "scrap_count": len(newer_articles_batch)
        }
    
    finally:
        db.close()

async def scrap_older_list_articles(headers, max_scrap, limit_article_per_page):
    print("\nMemulai pencarian artikel jadul...")

    db: Session = SessionLocal()
    try:
        existing_ids = set(row[0] for row in db.query(Article.id_inc).all())

        if not existing_ids:
            return {
            "status_code": 400,
            "status": "fail",
            "message": "Database lokalmu masih kosong! Gunakan script 'Tarik Data Baru' dulu mulai dari halaman 1."
        }

        print("cek artikel jadul")

        older_articles_batch = []
        # limit = 10
        i = 1
        estimation = len(existing_ids) // 10
        page = 1 if (estimation - 2) <= 0 else (estimation - 2)
        max_page = page + 100 
        # max_scrap = 10
        visited_page = 1
        stop_scrap = False

        # Mulai scraping
        print(f"Mulai dari page: {page}, Limit data setiap page: {limit_article_per_page}")
        async with httpx.AsyncClient() as client:
            while not stop_scrap and page <= max_page:
                params_list = {
                    "page": page,
                    "limit": limit_article_per_page
                }
                # Versi sinkronus
                # response_list = requests.get(settings.URL_ARTICLE_LIST, params=params_list, headers=headers)

                # Versi asinkronus
                try:
                    response_list = await client.get(settings.URL_ARTICLE_LIST, params=params_list, headers=headers)
                    # print(f"response_list\n {response_list.json()}")

                    if response_list.status_code != 200:
                        print(f"❌ Gagal buka halaman {page}. Status: {response_list.status_code}")
                        break

                    data_list = response_list.json().get('data', {}).get("contents", [])
                    
                    # JIKA MENTOK UJUNG DATABASE SERVER
                    if not data_list:
                        print("🛑 Halaman kosong! Kita sudah mencapai zaman purba (artikel pertama di server).")
                        break
                    
                    # jika artikel jadul
                    print(f"⛏️ Mulai menggali di Halaman {page}...")

                    for article in data_list:
                        id_inc_current = article["id_inc"]

                        if id_inc_current not in existing_ids:
                            print("Ketemu artikel fosil baru")
                            new_item = Article(
                                id=article["id"],
                                id_inc=id_inc_current,
                                slug=article["slug"],
                                status="slug_only"
                            )

                            older_articles_batch.append(new_item)

                            print(f"➕ Dapat fosil article baru {i}/{max_scrap}: {article['slug']}")

                            i += 1

                            if i > max_scrap:
                                print(f"🛑 Kuota habis ({max_scrap}). Sisa fosil dilanjut besok!")
                                stop_scrap = True
                                break
                    # else:
                    #     print("ketemu artikel fosil lama")
                except Exception as e:
                    print(f"⚠️ Error di halaman {page}: {e}")
                    break

                page += 1
                await asyncio.sleep(5)

            print(f"\n🎉 Berhasil menggali {len(older_articles_batch)} article masa lalu!")

            if older_articles_batch:
                print(f"💾 Menyimpan {len(older_articles_batch)} slug fosil ke PostgreSQL...")
                db.bulk_save_objects(older_articles_batch)
                db.commit()

        return {
            "status_code": 200,
            "status": "success",
            "message": "berhasil menggali artikel jadul",
            "scrap_count": len(older_articles_batch)
        }
    
    finally:
        db.close()
    
async def scrap_list_articles(token, mode, max_scrap):
    headers = settings.BASE_HEADERS.copy()
    headers["Authorization"] = f"Bearer {token}"
    if mode == "newer":
        # Scrap newer
        response = await scrap_newer_list_articles(headers, max_scrap)
        if response["status_code"] != 200:
            return {
                "status_code": 400,
                "status": "fail",
                "message": f"scrap list artikel {mode} gagal",
                "detail": response
            }
        
        scrap_count = response["scrap_count"]
        details_scrap = {
            "newer": scrap_count
        }

    elif mode == "older":
        # Scrap older
        response = await scrap_older_list_articles(headers, max_scrap)
        if response["status_code"] != 200:
            return {
                "status_code": 400,
                "status": "fail",
                "message": f"scrap list artikel {mode} gagal",
                "detail": response
            }
        
        scrap_count = response["scrap_count"]
        details_scrap = {
            "older": scrap_count
        }
        
    else:
        response_newer = await scrap_newer_list_articles(headers, max_scrap)
        response_older = await scrap_older_list_articles(headers, max_scrap)
        if response_newer["status_code"] != 200 or response_older["status_code"] != 200:
            return {
                "status_code": 400,
                "status": "fail",
                "message": f"scrap list artikel {mode} gagal",
                "detail": response
            }

        scrap_count_newer = response_newer["scrap_count"]
        scrap_count_older = response_older["scrap_count"]
        details_scrap = {
            "newer": scrap_count_newer,
            "older": scrap_count_older
        }

    return {
            "status_code": 200,
            "status": "success",
            "message": f"scrap list artikel list {mode} berhasil dan sudah tersimpan ke file {settings.FILE_LIST_PATH}",
            "details_scrap": details_scrap
        }

async def scrap_content_articles(headers):
    print("\n⚡ [Postgres] Memulai penarikan konten penuh (Asinkronus)...")

    db: Session = SessionLocal()
    try:
        # queue_articles = db.query(Article).filter(Article.status == "slug_only").limit(max_scrap).all()
        queue_articles = db.query(Article).filter(Article.status == "slug_only").all()

        if not queue_articles:
            print("✅ Semua list artikel di database sudah memiliki konten penuh.")
            return {
                "status_code": 200, 
                "status": "success",
                "message": "semua content artikel sudah diambil",
                "downloaded_count": 0
            }

        print(f"📋 Ditemukan {len(queue_articles)} antrean artikel yang siap ditarik kontennya.")

        # max_scrap = 10
        i = 1
        downloaded_count = 0
        stop_scrap = False

        async with httpx.AsyncClient() as client:
            for article in queue_articles:
                slug = article.slug

                url_article_content_final = f"{settings.URL_ARTICLE_CONTENT.rstrip('/')}/{slug}"
                # print(f"url konten: {url_article_content}")
                # print(f"url final: {url_article_content_final}")
                
                # Versi sinkronus
                # response_content = requests.get(url_article_content_final, headers=headers)

                # Versi asinkronus
                # print(f"url content: {url_article_content_final}")
                # print(f"headers: \n{headers}")

                try:
                    response_content = await client.get(url_article_content_final, headers=headers)

                    # if response_content.status_code == 401:
                    #     print("Cookie kadaluwarsa")
                    #     break

                    if response_content.status_code != 200:
                        print(f"❌ Gagal mengambil {slug} (Status: {response_content.status_code})")
                        print(f"Details: \n{response_content.json()}")
                        await asyncio.sleep(5)
                        continue

                    data = response_content.json().get("data", {})

                    # Cek apakah datanya benar-benar ada
                    if not data:
                        print(f"⚠️ Melewati {slug}: Isinya kosong dari server.")
                        continue 
                    
                    # Jika data ada
                    article.title = data.get("title", "Untitled")
                    article.content = data.get("article", "")
                    article.status = "scraped"

                    print(f"✅ [{i}/{len(queue_articles)}] Sukses menyedot konten: {slug}")
                    downloaded_count += 1
                    i += 1

                except Exception as e:
                    print(f"⚠️ Error tak terduga pada {slug}: {e}")

                await asyncio.sleep(5)
            
            # Commit seluruh perubahan data
            if downloaded_count > 0:
                print("💾 Mengunci perubahan konten ke PostgreSQL...")
                db.commit()
        
        return {
            "status_code": 200,
            "status": "success",
            "message": f"{downloaded_count} data artikel telah ditambah dan disimpan di chromadb",
            "scrap_count": len(queue_articles),
            "downloaded_count": downloaded_count
        }
    finally:
        db.close()

async def scrap_articles(token, mode, max_scrap, overlap_limit, page, limit_article_per_page):
    start_time = time.perf_counter()

    # Scrap
    headers = settings.BASE_HEADERS.copy()
    headers["Authorization"] = f"Bearer {token}"

    details_scrap = {
        "newer_article": 0,
        "older_article": 0
    }
    
    # Eksekusi Track 1: Ambil List Slug berdasarkan mode
    if mode == "newer":
        print("masuk scrap artikel newer")
        response_list = await scrap_newer_list_articles(headers, max_scrap, overlap_limit, page, limit_article_per_page)

        if response_list["status_code"] != 200:
            return {
                "status_code": response_list["status_code"],
                "status": response_list["status"],
                "message": f"gagal scrap list {mode}",
                "details": response_list
            }
        scrap_count = response_list["scrap_count"]
        details_scrap["newer_article"] = scrap_count

    elif mode == "older":
        response_list = await scrap_older_list_articles(headers, max_scrap, limit_article_per_page)

        if response_list["status_code"] != 200:
            return {
                "status_code": response_list["status_code"],
                "status": response_list["status_code"],
                "message": f"gagal scrap list {mode}",
                "details": response_list
            }
        
        scrap_count = response_list["scrap_count"]
        details_scrap["older_article"] = scrap_count

    else:
        response_list_newer_article = await scrap_newer_list_articles(headers, max_scrap, overlap_limit, page, limit_article_per_page)
        response_list_older_article = await scrap_older_list_articles(headers, max_scrap, limit_article_per_page)

        if response_list_newer_article["status_code"] != 200 or response_list_older_article["status_code"] != 200:
            return {
                "status_code": response_list_newer_article["status_code"],
                "status": "fail",
                "message": f"gagal scrap artikel {mode}",
                "details": [
                    response_list_newer_article,
                    response_list_older_article
                ]
            }
        
        scrap_count = response_list_newer_article["scrap_count"] + response_list_older_article["scrap_count"]
        details_scrap["newer_article"] = response_list_newer_article["scrap_count"]
        details_scrap["older_article"] = response_list_older_article["scrap_count"]

    res_content = await scrap_content_articles(headers)
    
    # Masukkan data ke database
    db: Session = SessionLocal()
    try:
        # HANYA ambil data yang sudah punya konten ('scraped') tapi belum masuk ChromaDB
        unsynced_articles = db.query(Article).filter(Article.status == "scraped").all()
        
        if unsynced_articles:
            print(f"\n🔄 Menemukan {len(unsynced_articles)} artikel yang belum masuk ke ChromaDB. Menyinkronkan...")
            
            lean_data_for_chroma = [
                {
                    "id": art.id,
                    "title": art.title or "",
                    "content": art.content or "",
                    "tags": []
                }
                for art in unsynced_articles
            ]
            
            # print(f"data ke chromadb: \n{lean_data_for_chroma}")
            # 1. Simpan ke ChromaDB
            await asyncio.to_thread(save_to_chromadb, token, lean_data_for_chroma)
            
            # 2. JIKA BERHASIL (tidak ada error dari fungsi di atas), update status di Postgres!
            for art in unsynced_articles:
                art.status = "vectorized"  # Status pamungkas!
            
            # Kunci perubahan ke database
            db.commit()
            print("✅ Sinkronisasi Postgres -> ChromaDB selesai sempurna.")
        else:
            print("\n✅ Seluruh data Postgres dan ChromaDB sudah sinkron.")

        # Hitung statistik akhir untuk dikembalikan ke Response API (Dashboard Next.js)
        total_list = db.query(Article).count()
        total_content = db.query(Article).filter(Article.status.in_(["scraped", "vectorized"])).count()
        total_chromadb = db.query(Article).filter(Article.status == "vectorized").count()

        end_time = time.perf_counter()
        exec_time_sec = str(round(end_time - start_time)) + "s"

        return {
            "status_code": 200,
            "status": "success",
            "message": "Pipeline database hybrid sukses dieksekusi.",
            "data": {
                "details_scrap": details_scrap,
                "system_health": {
                    "total_list": total_list,
                    "total_content": total_content,
                    "total_chromadb": total_chromadb
                },
                "mode": mode,
            },
            "exec_time": exec_time_sec
        }
        
    except Exception as e:
        db.rollback()
        print(f"❌ Terjadi kesalahan saat sinkronisasi ChromaDB: {e}")
        return {
            "status_code": 500,
            "status": "error",
            "message": f"Gagal menyinkronkan data: {str(e)}"
        }
    finally:
        db.close()