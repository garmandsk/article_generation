import time

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
from utils import (  # Opsional jika frontend masih butuh file ini
    get_from_chromadb,
)


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


def cluster_articles(payload):
    start_time = time.perf_counter()

    print("📦 Menarik Vektor dari Database Lokal...")

    collection = get_from_chromadb(settings.DB_PATH, settings.DB_NAME)

    chroma_db = collection.get(include=["embeddings", "documents"])

    chroma_ids = chroma_db["ids"]
    docs = chroma_db["documents"]
    embedding_vectors = chroma_db["embeddings"]

    if not chroma_ids:
        return {
            "status_code": 400,
            "status": "fail",
            "message": "ChromaDB kosong! Pastikan scraper sudah berjalan "
            "dan vektorisasi sukses.",
        }

    print("🚀 Memulai proses clustering model BERTopic...")

    # Persiapan Stopwords
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

    # print(f"{payload.embedding.}")
    # Persiapan model topic clustering

    # Ambil recommend_target artikel
    recommend_targets = (
        payload.recommend_target
    )  # ambil n cluster dengan jumlah artikel paling sedikit dari atas
    min_cf_range = payload.min_cf_range  # ambil persentase artikel diatas cf score

    topic_model = BERTopic(
        embedding_model=embedding_model_prep(
            model_name=payload.embedding_model_config.model_name,
            token=settings.HF_TOKEN,
        ),
        umap_model=umap_model_prep(
            n_neighbors=payload.umap_config.n_neighbors,
            n_components=payload.umap_config.n_components,
            min_dist=payload.umap_config.min_dist,
            metric=payload.umap_config.metric,
            random_state=payload.umap_config.random_state,
        ),
        hdbscan_model=hdbscan_model_prep(
            min_cluster_size=payload.hdbscan_config.min_cluster_size,
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
        verbose=True,
    )

    # Proses cluster (Training dari awal)
    topic, probabilities = topic_model.fit_transform(
        documents=docs, embeddings=embedding_vectors
    )

    # == Menggabungkan Hasil cluster dengan pgsql ==
    print("🔄 Menyinkronkan hasil AI dengan database PostgreSQL...")

    pg_db = SessionLocal()
    try:
        pg_db_articles = pg_db.query(Article).filter(Article.id.in_(chroma_ids)).all()
        article_map = {
            art.id: {"id_inc": art.id_inc, "slug": art.slug, "title": art.title}
            for art in pg_db_articles
        }

        # Susun metadata sesuai dengan urutan list "chroma_ids"
        mapped_metada = [article_map.get(cid, {}) for cid in chroma_ids]

        # Buat dataframe dari metadata barusan
        df_raw = pd.DataFrame(mapped_metada)

        # Masukkan hasil clustering
        df_raw["id"] = chroma_ids
        df_raw["article_text"] = docs
        df_raw["id_topic"] = topic
        df_raw["skor_cf"] = probabilities

        mapping_topic_name = (
            topic_model.get_topic_info().set_index("Topic")["Name"].to_dict()
        )
        df_raw["name_topic"] = df_raw["id_topic"].map(mapping_topic_name)

        # Filtering
        df_clean = df_raw[
            (df_raw["id_topic"] != -1) & (df_raw["skor_cf"] >= min_cf_range)
        ]

        print(f"Total Artikel Awal: {len(df_raw)}")
        print(
            f"Total Artikel Setelah Filtering (>{min_cf_range * 100}% Yakin): "
            f"{len(df_clean)}"
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

        # Menyimpan hasil clustering
        print("💾 Menyimpan label cluster ke PostgreSQL...")

        pg_db.query(Article).filter(Article.id.in_(chroma_ids)).update(
            {
                "cluster_topic": None,
                "cluster_keywords": None,
                "is_recommended": False,
                "status": "outlier_cluster",
            },
            synchronize_session=False,
        )

        # Update nilai kolom 'cluster_topic' untuk setiap artikel yang lulus filter
        for index, row in df_clean.iterrows():
            article_id = str(row["id"])
            topic_text = str(row["name_topic"])

            # Ekstrak id, nama, dan keywords setiap cluster
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

        pg_db.commit()
        print("✅ Database PostgreSQL berhasil diperbarui sepenuhnya.")

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

        # Sorting list cluster berdasarkan index secara ascending
        final_cluster_list = sorted(final_cluster_list, key=lambda x: x["cluster_id"])

        end_time = time.perf_counter()
        exec_time_sec = str(round(end_time - start_time)) + "s"

        return {
            "status_code": 200,
            "status": "success",
            "message": "Clustering selesai dan seluruh state disimpan di PostgreSQL.",
            "data": {
                "metadatas": {
                    "total_cluster": len(final_cluster_list),
                    "total_recommended": len(recommend_cluster_ids),
                    "clustered_total_article": len(df_clean),
                    "outlier_total_article": len(df_raw) - len(df_clean),
                    "min_cf_range": min_cf_range,
                },
                "cluster": final_cluster_list,
            },
            "exec_time": exec_time_sec,
        }

    except Exception as e:
        pg_db.rollback()
        print(f"❌ Gagal menyinkronkan dengan PostgreSQL: {e}")
        return {
            "status_code": 500,
            "status": "error",
            "message": f"Gagal memproses clustering: {str(e)}",
        }
    finally:
        pg_db.close()
