import asyncio
import time
from datetime import datetime, timedelta, timezone

import nltk
import pandas as pd
from bertopic import BERTopic
from bertopic.representation import KeyBERTInspired, MaximalMarginalRelevance
from bertopic.vectorizers import ClassTfidfTransformer
from hdbscan import HDBSCAN
from nltk.corpus import stopwords
from sentence_transformers import SentenceTransformer
from sklearn.feature_extraction.text import CountVectorizer
from umap import UMAP

from config import settings
from config.database import SessionLocal
from models.models import Article
from utils import get_from_chromadb, log_msg  # Pastikan log_msg di-import


def embedding_model_prep(model_name, token):
    embedding_model = SentenceTransformer(model_name_or_path=model_name, token=token)
    return embedding_model


def umap_model_prep(n_neighbors, n_components, min_dist, metric, random_state):
    umap_model = UMAP(
        n_neighbors=n_neighbors,
        n_components=n_components,
        min_dist=min_dist,
        metric=metric,
        random_state=random_state,
    )
    return umap_model


def hdbscan_model_prep(
    min_cluster_size, min_samples, metric, cluster_selection_method, prediction_data
):
    hdbscan_model = HDBSCAN(
        min_cluster_size=min_cluster_size,
        min_samples=min_samples,
        metric=metric,
        cluster_selection_method=cluster_selection_method,
        prediction_data=prediction_data,
    )
    return hdbscan_model


def vectorizer_model_prep(stop_words, ngram_range, min_df):
    vectorizer_model = CountVectorizer(
        stop_words=stop_words,
        ngram_range=ngram_range,
        # min_df=min_df
    )
    return vectorizer_model


def ctfidf_model_prep(bm25_weighting, reduce_frequent_words):
    ctfidf_model = ClassTfidfTransformer(
        bm25_weighting=bm25_weighting, reduce_frequent_words=reduce_frequent_words
    )
    return ctfidf_model


def representation_models_prep():
    # Multi-representation model implementation
    keybert_model = KeyBERTInspired()
    mmr_model = MaximalMarginalRelevance(diversity=0.3)

    representation_models = {
        "KeyBERT": keybert_model,
        "MMR": mmr_model,
        "Main": keybert_model,
    }
    return representation_models


def extract_info_cluster(raw_text):
    sliced_text = raw_text.split("_")
    cluster_id = int(sliced_text[0])
    keywords = [k.strip() for k in sliced_text[1:]]
    cluster_name = keywords[0].title()
    return cluster_id, cluster_name, keywords


async def cluster_articles_stream(payload, token):
    start_time = time.perf_counter()

    try:
        days_ago = payload.days_ago
        yield log_msg(
            f"🔍 Memulai filter temporal: "
            f"{'Semua Waktu' if days_ago == 0 else f'{days_ago} Hari Terakhir'}...",
            2,
        )

        # ================================================================
        # TAHAP 1: FILTER WAKTU VIA POSTGRESQL DULU
        # ================================================================
        pg_db = SessionLocal()
        valid_ids_list = []
        try:
            # Ambil hanya artikel yang sudah memiliki teks/vektor
            query = pg_db.query(Article.id).filter(
                Article.status.in_(["vectorized", "clustered", "outlier_cluster"])
            )

            # Terapkan filter temporal jika days_ago > 0
            if days_ago > 0:
                target_date = datetime.now(timezone.utc) - timedelta(days=days_ago)
                query = query.filter(Article.published_at >= target_date)

            valid_articles = query.all()
            valid_ids_list = [str(art.id) for art in valid_articles]
        finally:
            pg_db.close()  # Tutup sesi sejenak untuk hemat memori

        # Pengaman jika tidak ada artikel di rentang waktu tersebut
        if not valid_ids_list:
            yield log_msg(
                f"❌ Tidak ada artikel yang "
                f"diterbitkan dalam {days_ago} hari terakhir.",
                status="error",
            )
            return

        # ================================================================
        # TAHAP 2: TARIK VEKTOR SELEKTIF DARI CHROMADB
        # ================================================================
        yield log_msg(f"📦 Menarik {len(valid_ids_list)} Vektor dari ChromaDB...", 5)

        collection = get_from_chromadb(settings.DB_CHROMA_PATH, settings.DB_NAME)

        chroma_db = collection.get(
            ids=valid_ids_list, include=["embeddings", "documents"]
        )

        chroma_ids = chroma_db["ids"]
        docs = chroma_db["documents"]
        embedding_vectors = chroma_db["embeddings"]

        total_docs = len(docs)
        if total_docs < 10:
            yield log_msg(
                f"❌ Data terlalu sedikit ({total_docs} artikel). "
                "Minimal butuh 10 artikel untuk membentuk klaster yang valid.",
                status="error",
            )
            return

        # ================================================================
        # TAHAP 3: SETUP BERTOPIC & MLOPS PIPELINE
        # ================================================================
        yield log_msg("⚙️ Mengunduh dan menyiapkan kamus Stopwords...", 10)
        nltk.download("stopwords", quiet=True)
        stopwords_list = stopwords.words("indonesian")
        custom_stopwords = [
            "sarah",
            "seperti",
            "bisa",
            "menjadi",
            "karena",
            "untuk",
            "dengan",
            "itu",
            "ini",
            "yang",
            "dan",
            "di",
            "dalam",
        ]
        stopwords_list.extend(custom_stopwords)

        yield log_msg(
            "🧠 Merakit arsitektur model BERTopic (UMAP, HDBSCAN, dll)...", 15
        )

        recommend_targets = payload.recommend_target
        min_cf_range = payload.min_cf_range

        # Pengamanan jumlah n_neighbors
        requested_n_neighbors = payload.umap_config.n_neighbors
        safe_n_neighbors = max(2, min(requested_n_neighbors, total_docs - 1))

        # Pengamanan jumlah min_cluster_size
        requested_min_cluster_size = payload.hdbscan_config.min_cluster_size
        safe_min_cluster_size = max(2, min(requested_min_cluster_size, total_docs // 2))

        topic_model = BERTopic(
            embedding_model=embedding_model_prep(
                model_name=payload.embedding_model_config.model_name,
                token=settings.HF_TOKEN,
            ),
            umap_model=umap_model_prep(
                n_neighbors=safe_n_neighbors,
                n_components=payload.umap_config.n_components,
                min_dist=payload.umap_config.min_dist,
                metric=payload.umap_config.metric,
                random_state=payload.umap_config.random_state,
            ),
            hdbscan_model=hdbscan_model_prep(
                min_cluster_size=safe_min_cluster_size,
                min_samples=payload.hdbscan_config.min_samples,
                metric=payload.hdbscan_config.metric,
                cluster_selection_method=payload.hdbscan_config.cluster_selection_method,
                prediction_data=payload.hdbscan_config.prediction_data,
            ),
            vectorizer_model=vectorizer_model_prep(
                stop_words=stopwords_list,
                ngram_range=payload.vectorizer_config.ngram_range,
                min_df=payload.vectorizer_config.min_df,
            ),
            ctfidf_model=ctfidf_model_prep(
                bm25_weighting=payload.ctfidf_config.bm25_weighting,
                reduce_frequent_words=payload.ctfidf_config.reduce_frequent_words,
            ),
            representation_model=representation_models_prep(),
            verbose=False,
        )

        yield log_msg(
            "🚀 Memulai proses fitting & transformasi BERTopic "
            "(Ini akan memakan waktu)...",
            20,
        )

        # Offload proses berat ke thread agar EventStream tidak macet
        topic, probabilities = await asyncio.to_thread(
            topic_model.fit_transform, documents=docs, embeddings=embedding_vectors
        )

        yield log_msg("✅ Model BERTopic selesai dilatih! Memetakan hasil...", 60)

        # ================================================================
        # TAHAP 4: SINKRONISASI HASIL CLUSTER KEMBALI KE POSTGRESQL
        # ================================================================
        yield log_msg("🔄 Menarik metadata dari PostgreSQL untuk disinkronisasi...", 65)

        pg_db = SessionLocal()  # Buka sesi baru untuk update
        try:
            pg_db_articles = (
                pg_db.query(Article).filter(Article.id.in_(chroma_ids)).all()
            )
            article_map = {
                art.id: {"id_inc": art.id_inc, "slug": art.slug, "title": art.title}
                for art in pg_db_articles
            }

            mapped_metada = [article_map.get(cid, {}) for cid in chroma_ids]
            df_raw = pd.DataFrame(mapped_metada)

            df_raw["id"] = chroma_ids
            df_raw["article_text"] = docs
            df_raw["id_topic"] = topic
            df_raw["skor_cf"] = probabilities

            mapping_topic_name = (
                topic_model.get_topic_info().set_index("Topic")["Name"].to_dict()
            )
            df_raw["name_topic"] = df_raw["id_topic"].map(mapping_topic_name)

            # Filtering Outlier & Confidence
            yield log_msg(
                f"🧹 Membersihkan outlier dan memfilter "
                F"confidence > {min_cf_range * 100}%...",
                70,
            )
            df_clean = df_raw[
                (df_raw["id_topic"] != -1) & (df_raw["skor_cf"] >= min_cf_range)
            ]

            yield log_msg(
                f"📊 Total Awal: {len(df_raw)} | Lulus Filter: {len(df_clean)}", 75
            )

            df_article_topic = df_clean["name_topic"].value_counts().reset_index()
            df_article_topic.columns = ["name_topic", "article_count"]
            df_article_topic_ascending = df_article_topic.sort_values(
                by="article_count", ascending=True
            )

            df_recommend = df_article_topic_ascending.head(recommend_targets)

            recommend_cluster_ids = []
            for text in df_recommend["name_topic"]:
                cid, _, _ = extract_info_cluster(text)
                recommend_cluster_ids.append(cid)

            # Reset SEMUA status artikel lama agar dashboard UI bersih
            # (hanya menampilkan klaster dari rentang waktu yang baru dipilih)
            yield log_msg("💾 Membersihkan sisa label cluster lama di database...", 80)
            pg_db.query(Article).filter(
                Article.status.in_(["clustered", "outlier_cluster"])
            ).update(
                {
                    "cluster_topic": None,
                    "cluster_keywords": None,
                    "is_recommended": False,
                    "status": "vectorized",
                },
                synchronize_session=False,
            )

            # Update status outlier untuk data yang di-cluster saat ini
            yield log_msg(
                "💾 Menyimpan label cluster sementara (outlier) ke PostgreSQL...", 82
            )
            pg_db.query(Article).filter(Article.id.in_(chroma_ids)).update(
                {
                    "cluster_topic": None,
                    "cluster_keywords": None,
                    "is_recommended": False,
                    "status": "outlier_cluster",
                },
                synchronize_session=False,
            )

            yield log_msg(
                "💾 Menulis ulang label cluster yang valid ke dalam database...", 85
            )

            total_clean = len(df_clean)
            for index, row in df_clean.iterrows():
                article_id = str(row["id"])
                topic_text = str(row["name_topic"])

                cid, cname, ckeywords = extract_info_cluster(topic_text)
                recommend_status = bool(cid in recommend_cluster_ids)

                pg_db.query(Article).filter(Article.id == article_id).update(
                    {
                        "cluster_topic": cname,
                        "cluster_keywords": ckeywords,
                        "is_recommended": recommend_status,
                        "status": "clustered",
                    },
                    synchronize_session=False,
                )

                if index > 0 and index % max(1, (total_clean // 5)) == 0:
                    yield log_msg(
                        f"✍️ Mengunci data ke-{index} dari {total_clean}...",
                        85 + int((index / total_clean) * 10),
                    )

            pg_db.commit()
            yield log_msg("✅ Database PostgreSQL berhasil diperbarui sepenuhnya.", 95)

            # Siapkan Output Final
            final_cluster_list = []
            for index, row in df_article_topic_ascending.iterrows():
                text = str(row["name_topic"])
                article_count = int(row["article_count"])
                cid, cname, ckeywords = extract_info_cluster(text)
                recommend_status = bool(cid in recommend_cluster_ids)

                final_cluster_list.append(
                    {
                        "cluster_id": cid,
                        "cluster_name": cname,
                        "cluster_keywords": ckeywords,
                        "article_count": article_count,
                        "is_recommended": recommend_status,
                    }
                )

            final_cluster_list = sorted(
                final_cluster_list, key=lambda x: x["cluster_id"]
            )

            end_time = time.perf_counter()
            exec_time_sec = str(round(end_time - start_time)) + "s"

            final_result = {
                "status_code": 200,
                "status": "success",
                "message": f"Clustering selesai. {len(final_cluster_list)} "
                "cluster terbentuk dari data "
                f"{'semua waktu' if days_ago == 0 else f'{days_ago} hari terakhir'}.",
                "data": {
                    "metadatas": {
                        "total_cluster": len(final_cluster_list),
                        "total_recommended": len(recommend_cluster_ids),
                        "clustered_total_article": len(df_clean),
                        "outlier_total_article": len(df_raw) - len(df_clean),
                        "min_cf_range": min_cf_range,
                        "time_filter_days": days_ago,
                    },
                    "cluster": final_cluster_list,
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

        finally:
            pg_db.close()

    except Exception as e:
        yield log_msg(f"❌ Gagal memproses clustering: {str(e)}", status="error")
