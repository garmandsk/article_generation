import pandas as pd
import chromadb
import nltk
from nltk.corpus import stopwords
from sentence_transformers import SentenceTransformer
from umap import UMAP
from hdbscan import HDBSCAN
from sklearn.feature_extraction.text import CountVectorizer
from bertopic.vectorizers import ClassTfidfTransformer
from bertopic.representation import MaximalMarginalRelevance, KeyBERTInspired
from bertopic import BERTopic
from config import settings
from utils import save_to_json, get_from_json, save_to_chromadb, get_from_chromadb

def embedding_model_prep(model_name, token):
    embedding_model = SentenceTransformer(
        model_name_or_path=model_name,
        token=token
    )
    return embedding_model

def umap_model_prep(n_neighbors, n_components, min_dist, metric, random_state):
    umap_model = UMAP(
        n_neighbors=n_neighbors,
        n_components=n_components,
        min_dist=min_dist,
        metric=metric,
        random_state=random_state
    )
    return umap_model

def hdbscan_model_prep(min_cluster_size, min_samples, metric, cluster_selection_method, prediction_data):
    hdbscan_model = HDBSCAN(
        min_cluster_size=min_cluster_size,
        min_samples=min_samples,
        metric=metric,
        cluster_selection_method=cluster_selection_method,
        prediction_data=prediction_data
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
        bm25_weighting=bm25_weighting,
        reduce_frequent_words=reduce_frequent_words
    )
    return ctfidf_model

def representation_models_prep():
    # Multi-representation model implementation
    keybert_model = KeyBERTInspired()
    mmr_model = MaximalMarginalRelevance(diversity=0.3)

    representation_models = {
        "KeyBERT":keybert_model,
        "MMR":mmr_model,
        "Main":keybert_model
    }
    return representation_models

def extract_info_cluster(raw_text):
    sliced_text = raw_text.split("_")
    cluster_id = int(sliced_text[0])
    keywords = [k.strip() for k in sliced_text[1:]]
    cluster_name = keywords[0].title()
    return cluster_id, cluster_name, keywords

def cluster_articles(payload, token):
    print("📦 Menarik Vektor dari Database Lokal...")
    
    data_list = get_from_json(settings.FILE_LIST_PATH)
    total_data_list = len(data_list)

    data_content = get_from_json(settings.FILE_CONTENT_PATH)
    total_data_content = len(data_content)

    collection = get_from_chromadb(settings.DB_PATH, settings.DB_NAME)
    total_data_db = collection.count()

    # Jika total data db dan content tidak sama maka disamakan dulu sebelum clustering
    if total_data_db != total_data_content or total_data_db != total_data_list:
        print("Terdapat kesenjangan antara data content dan chromadb")
        print(f"Total data content: {total_data_content}")
        print(f"Total data ChromaDB: {total_data_db}")
        save_to_chromadb(token, data_content)
    
    print("Memulai clustering")
    
    data_db = collection.get(include=['embeddings', 'documents', 'metadatas'])

    docs = data_db['documents']
    embedding_vectors = data_db['embeddings']
    metadatas = data_db['metadatas']

    # Persiapan Stopwords
    nltk.download('stopwords', quiet=True)
    stopwords_list = stopwords.words('indonesian')
    custom_stopwords = ['sarah', 'seperti', 'bisa', 'menjadi', 'karena', 'untuk', 'dengan', 'itu', 'ini', 'yang', 'dan', 'di', 'dalam']
    stopwords_list.extend(custom_stopwords)

    # print(f"{payload.embedding.}")
    # Persiapan model topic clustering
    topic_model = BERTopic(
        embedding_model=embedding_model_prep(
            model_name=payload.embedding_model_config.model_name, 
            token=payload.embedding_model_config.token
        ),
        umap_model = umap_model_prep(
            n_neighbors=payload.umap_config.n_neighbors, 
            n_components=payload.umap_config.n_components, 
            min_dist=payload.umap_config.min_dist, 
            metric=payload.umap_config.metric, 
            random_state=payload.umap_config.random_state
        ),
        hdbscan_model=hdbscan_model_prep(
            min_cluster_size=payload.hdbscan_config.min_cluster_size, 
            min_samples=payload.hdbscan_config.min_samples, 
            metric=payload.hdbscan_config.metric,
            cluster_selection_method=payload.hdbscan_config.cluster_selection_method,
            prediction_data=payload.hdbscan_config.prediction_data
        ),
        vectorizer_model=vectorizer_model_prep(
            stop_words=stopwords_list,
            ngram_range=payload.vectorizer_config.ngram_range, 
            min_df=payload.vectorizer_config.min_df
        ),
        ctfidf_model=ctfidf_model_prep(
            bm25_weighting=payload.ctfidf_config.bm25_weighting, 
            reduce_frequent_words=payload.ctfidf_config.reduce_frequent_words
        ),
        representation_model=representation_models_prep(),
        verbose=True
    )

    # Proses cluster
    topic, probabilities = topic_model.fit_transform(
        docs,
        embeddings=embedding_vectors
    )

    # Preprocess data hasil cluster
    df_raw = pd.DataFrame(metadatas)

    # Penambahan data hasil clustering dataframe
    df_raw["article_text"] = docs
    df_raw["id_topic"] = topic

    mapping_topic_name = topic_model.get_topic_info().set_index("Topic")["Name"].to_dict()
    df_raw["name_topic"] = df_raw["id_topic"].map(mapping_topic_name)

    df_raw["skor_cf"] = probabilities

    # Filtering
    min_cf_range = 0.50
    df_clean = df_raw[
        (df_raw["id_topic"] != -1) & 
        (df_raw["skor_cf"] >= min_cf_range)
    ]
    print(f"Total Artikel Awal: {len(df_raw)}")
    print(f"Total Artikel Setelah Filtering (>{min_cf_range*100}% Yakin): {len(df_clean)}") 

    # Sorting Ascending berdasarkan jumlah artikel suatu topik
    df_article_topic = df_clean["name_topic"].value_counts().reset_index()
    df_article_topic.columns = ["name_topic", "article_count"]
    df_article_topic_ascending = df_article_topic.sort_values(by="article_count", ascending=True)

    # Ambil niche_target artikel
    niche_targets = 3 # ambil 3 cluster dengan jumlah artikel paling sedikit dari atas
    df_niche = df_article_topic_ascending.head(niche_targets)

    niche_cluster_ids = []
    for text in df_niche["name_topic"]:
        cid, _, _ = extract_info_cluster(text)
        niche_cluster_ids.append(cid)

    final_cluster_list = []
    for index, row in df_article_topic_ascending.iterrows():
        text = row["name_topic"]
        article_count = row["article_count"]

        cid, cname, ckeywords = extract_info_cluster(text)

        recommend_status = cid in niche_cluster_ids

        final_cluster_list.append({
            "cluster_id": cid,
            "cluster_name": cname,
            "cluster_keywords": ckeywords,
            "article_count": article_count,
            "is_recommended": recommend_status
        })

    # Sorting list cluster berdasarkan index secara ascending
    final_cluster_list = sorted(final_cluster_list, key=lambda x: x["cluster_id"])

    # Susun output json
    data_cluster_final = {
        "metadatas": {
            "total_clusters" : len(final_cluster_list),
            "total_recommended": len(niche_cluster_ids)
        },
        "clusters": final_cluster_list
    }

    save_to_json(settings.FILE_TOPIC_DATA_PATH, data_cluster_final)

    # Kirim hasil cluster
    data = {
        "status_code": 200,
        "status": "success",
        "message": "Clustering selesai",
        "data": data_cluster_final
    }

    return data