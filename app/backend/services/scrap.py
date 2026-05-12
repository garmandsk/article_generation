import json
import time
import os
import pandas as pd
import httpx
import asyncio
import requests
from config import settings
from utils import get_from_json, save_to_json, merge_and_save_articles_list_to_json, save_to_chromadb
    
async def scrap_newer_list_articles(headers, max_scrap):
    print("\nMemulai pencarian artikel baru...")

    id_inc_highest_local = 0 
    local_article = await asyncio.to_thread(get_from_json, settings.FILE_LIST_PATH)

    if len(local_article) > 0:
        id_inc_highest_local = max([item['id_inc'] for item in local_article])
        print(f"📌 Resume dari id_inc terakhir: {id_inc_highest_local}")
    else:
        print("📌 File ada, tapi isinya list kosong. mulai dari 0")
        
    set_id_local = set([item["id_inc"] for item in local_article])
    newer_article = []
    overlap_limit = 10
    overlap_counter = 0
    i = 1
    page = 1
    limit = 10
    # max_scrap = 10

    stop_scrap = False

    print("Mulai menjelajahi data terbaru - lokal")
    print(f"Mulai dari page: {page}, Limit data setiap page: {limit}")
    async with httpx.AsyncClient() as client:
        while not stop_scrap:
            print(f"\n📄 Membuka Halaman {page}...")

            params_list = {
                "page": page,
                "limit": limit
            }

            # Versi sinkronus
            # response_list = requests.get(settings.URL_ARTICLE_LIST, params=params_list, headers=headers)

            # Versi asinkronus
            response_list = await client.get(settings.URL_ARTICLE_LIST, params=params_list, headers=headers)
            # print(f"response_list\n {response_list.json()}")

            if response_list.status_code != 200:
                print("❌ Gagal buka halaman {page}. Status: {response_list.status_code}")
                break

            data = response_list.json().get("data", {})
            data_list = data.get("contents", [])

            if not data_list:
                print("🛑 Halaman kosong! Kita sudah mencapai zaman purba (artikel pertama di server).")
                break

            for article in data_list:
                id_inc_current = article["id_inc"]

                # SKENARIO A: Artikel SUDAH ADA di lokal
                if id_inc_current in set_id_local:
                    overlap_counter += 1

                    if overlap_counter >= overlap_limit:
                        print(f"🛑 Menyentuh dasar data lama ({overlap_limit} beruntun). Tarik rem darurat!")
                        stop_scrap = True # Beri sinyal agar Loop Luar juga ikut berhenti
                        break # Hentikan Loop Dalam
                    continue

                # SKENARIO B: Artikel BARU atau GAP
                overlap_counter = 0

                newer_article.append({
                    'id_inc': id_inc_current,
                    'id': article['id'],
                    'slug': article['slug']
                })
                print(f"➕ Dapat artikel {i}/{max_scrap} (Baru/Gap): {article['slug']}")

                i += 1

                # SKENARIO C: KUOTA HABIS
                if i > max_scrap:
                    print(f"🛑 Kuota habis ({max_scrap}). Sisa gap dilanjut besok!")
                    stop_scrap = True
                    break

            page += 1

    print("Menggabungkan dan membersihkan data...")
    await asyncio.to_thread(merge_and_save_articles_list_to_json, local_article, newer_article)

    return {
            "status_code": 200,
            "status": "success",
            "message": "berhasil menggali artikel baru",
            "scrap_count": len(newer_article)
        }

async def scrap_older_list_articles(headers, max_scrap):
    print("\nMemulai pencarian artikel jadul...")

    local_article = await asyncio.to_thread(get_from_json, settings.FILE_LIST_PATH)

    # print(len(local_article))
    if len(local_article) == 0:
        return {
            "status_code": 400,
            "status": "fail",
            "message": "Database lokalmu masih kosong! Gunakan script 'Tarik Data Baru' dulu mulai dari halaman 1."
        }
    else: 
        print("cek artikel jadul")

        older_article = []
        set_id_local = set([item['id_inc'] for item in local_article])

        limit = 10
        i = 1
        estimation = len(local_article) // 10
        page = 1 if (estimation - 2) <= 0 else (estimation - 2)
        max_page = page + 20 
        # max_scrap = 10
        visited_page = 1
        stop_scrap = False

        # Mulai scraping
        print(f"Mulai dari page: {page}, Limit data setiap page: {limit}")
        async with httpx.AsyncClient() as client:
            while not stop_scrap and page <= max_page:
                params_list = {
                    "page": page,
                    "limit": limit
                }
                # Versi sinkronus
                # response_list = requests.get(settings.URL_ARTICLE_LIST, params=params_list, headers=headers)

                # Versi asinkronus
                response_list = await client.get(settings.URL_ARTICLE_LIST, params=params_list, headers=headers)
                # print(f"response_list\n {response_list.json()}")

                data = response_list.json().get('data', [])
                data_list = data.get("contents", {})

                # JIKA MENTOK UJUNG DATABASE SERVER
                if not data_list:
                    print("🛑 Halaman kosong! Kita sudah mencapai zaman purba (artikel pertama di server).")
                    break
                    
                # jika artikel jadul
                print(f"⛏️ Mulai menggali di Halaman {page}...")

                for article in data_list:
                    id_inc_current = article["id_inc"]

                    if id_inc_current not in set_id_local:
                        print("Ketemu artikel fosil baru")
                        older_article.append(
                            {
                                "id_inc": article["id_inc"],
                                "id": article["id"],
                                "slug": article["slug"]
                            }
                        )

                        print(f"➕ Dapat fosil article baru {i}/{max_scrap}: {article['slug']}")

                        i += 1

                        if i > max_scrap:
                            print(f"🛑 Kuota habis ({max_scrap}). Sisa fosil dilanjut besok!")
                            stop_scrap = True
                            break
                    # else:
                    #     print("ketemu artikel fosil lama")
                page += 1
                time.sleep(5)

        print(f"\n🎉 Berhasil menggali {len(older_article)} article masa lalu!")

        print("Menggabungkan dan membersihkan data...")
        await asyncio.to_thread(merge_and_save_articles_list_to_json, local_article, older_article)

        return {
            "status_code": 200,
            "status": "success",
            "message": "berhasil menggali artikel jadul",
            "scrap_count": len(older_article)
        }
    
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

def scrap_content_articles(headers, max_scrap):
    print("\nMemulai pencarian artikel konten...")
    
    local_list_article = get_from_json(settings.FILE_LIST_PATH)
    if len(local_list_article) == 0:
        return {
                "status_code": 400,
                "status": "fail",
                "message": "file list masih kosong, ambil list dulu"
            }
    else:   
        print("ambil konten")

        local_content_article = get_from_json(settings.FILE_CONTENT_PATH)
        content_article = []
        set_id_local = set([item['id_inc'] for item in local_content_article])

        # max_scrap = 10
        i = 1
        stop_scrap = False

        for article in local_list_article:
            id_inc_current = article["id_inc"]
            slug = article["slug"]

            if id_inc_current in set_id_local:
                # print(f"skip {id_inc_current}")
                continue

            try:
                url_article_content_final = f"{settings.URL_ARTICLE_CONTENT.rstrip('/')}/{slug}"
                # print(f"url konten: {url_article_content}")
                # print(f"url final: {url_article_content_final}")
                
                # Versi sinkronus
                # response_content = requests.get(url_article_content_final, headers=headers)

                # Versi asinkronus
                # print(f"url content: {url_article_content_final}")
                # print(f"headers: \n{headers}")
                response_content = requests.get(url_article_content_final, headers=headers)

                # if response_content.status_code == 401:
                #     print("Cookie kadaluwarsa")
                #     break

                if response_content.status_code != 200:
                    print(f"❌ Gagal mengambil {slug} (Status: {response_content.status_code})")
                    print(f"Details: \n{response_content.json()}")
                    time.sleep(5)
                    continue

                data = response_content.json().get("data", {})

                # Cek apakah datanya benar-benar ada
                if not data:
                    print(f"⚠️ Melewati {slug}: Isinya kosong dari server.")
                    continue 

                content_article.append(
                    {
                        "id_inc": data.get("id_inc"),
                        "id": data.get("id"),
                        "slug": data.get("slug", slug),
                        "title": data.get("title", "Tanpa Judul"), 
                        "content": data.get("article", ""),        "tags": data.get("tags", []),
                    }
                )

                print(f"✅ Sukses menarik ({i}/{max_scrap}): {slug}")
                print(id_inc_current)

                i += 1

                if i > max_scrap:
                    print(f"🛑 Kuota habis ({max_scrap}). Sisa gap dilanjut besok!")
                    break

            except Exception as e:
                print(f"⚠️ Error tak terduga pada {slug}: {e}")

            time.sleep(5)

        print(f"Berhasil mengambil {len(content_article)} konten")

        if len(content_article) > 0:
            dirty_data_merge = local_content_article + content_article
            data_unique_dict = {item["id_inc"]: item for item in dirty_data_merge}
            data_final = list(data_unique_dict.values())
            data_final.sort(key=lambda article: article["id_inc"], reverse=True)

            save_to_json(settings.FILE_CONTENT_PATH, data_final)
            print(f"data konten lokal: {len(local_content_article)}")
            print(f"data konten: {len(content_article)}")
            print(f"\n🎉 Selesai! {len(data_final)} konten telah ditambahkan")

            data_list = get_from_json(settings.FILE_LIST_PATH)
            total_data_list = len(data_list)
            total_data_content = len(data_final)

            return {
                "status_code": 200,
                "status": "success",
                "message": f"{len(data_final)} data artikel telah ditambah dan disimpan di chromadb",
                "scrap_count": max_scrap,
                "total_data": {
                    "list": total_data_list,
                    "content": total_data_content
                }
            }
        else:
            return {
                "status_code": 200,
                "status": "success",
                "message": "✅ Semua list artikel sudah memiliki konten. Tidak ada yang didownload."
            }

async def scrap_articles(token, mode, max_scrap):
    # Scrap
    headers = settings.BASE_HEADERS.copy()
    headers["Authorization"] = f"Bearer {token}"
    
    # Membuat pesan dinamis agar tidak perlu if-else yang panjang
    if mode == "newer":
        print("masuk scrap artikel newer")
        response_list = await scrap_newer_list_articles(headers, max_scrap)

        if response_list["status_code"] != 200:
            return {
                "status_code": response_list["status_code"],
                "status": response_list["status"],
                "message": f"gagal scrap list {mode}",
                "details": response_list
            }
     
        scrap_count = response_list["scrap_count"]
        details_scrap = {
            "newer_article": scrap_count
        }

        response_content = await scrap_content_articles(headers, scrap_count)
        if response_content["status_code"] != 200:
            return {
                "status_code": response_content["status_code"],
                "status": response_content["status"],
                "message": f"gagal scrap content {mode}",
                "details": response_content
            }
        
        msg = "Artikel TERBARU berhasil ditarik dan tersimpan di database"

    elif mode == "older":
        response_list = await scrap_older_list_articles(headers, max_scrap)

        if response_list["status_code"] != 200:
            return {
                "status_code": response_list["status_code"],
                "status": response_list["status_code"],
                "message": f"gagal scrap list {mode}",
                "details": response_list
            }
        
        scrap_count = response_list["scrap_count"]
        details_scrap = {
            "older_article": scrap_count
        }

        response_content = await scrap_content_articles(headers, scrap_count)
        if response_content["status_code"] != 200:
            return {
                "status_code": response_content["status_code"],
                "status": response_content["status"],
                "message": f"gagal scrap content {mode}",
                "details": response_content
            }

        msg = "Artikel LAMA berhasil ditarik dan tersimpan di database"

    else:
        response_list_newer_article = await scrap_newer_list_articles(headers, max_scrap)
        response_list_older_article = await scrap_older_list_articles(headers, max_scrap)

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
        details_scrap = {
            "newer_article": response_list_newer_article["scrap_count"],
            "older_article": response_list_older_article["scrap_count"]
        }

        response_content = await asyncio.to_thread(scrap_content_articles, headers, scrap_count)
        if response_content["status_code"] != 200:
            return {
                "status_code": response_content["status_code"],
                "status": response_content["status"],
                "message": f"gagal scrap content {mode}",
                "details": response_content
            }
    
    data_content = await asyncio.to_thread(get_from_json, settings.FILE_CONTENT_PATH)

    # Simpan ke chromadb
    await asyncio.to_thread(save_to_chromadb, token, data_content)

    return {
        "status_code": 200,
        "status": "success",
        "message": f"{scrap_count} artikel berhasil ditarik dan tersimpan di database",
        "details_scrap": details_scrap,
        "mode": mode
    }