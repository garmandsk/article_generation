import chromadb
from chromadb.utils import embedding_functions

client = chromadb.PersistentClient(path="./db_artikel")

embedder = embedding_functions.SentenceTransformerEmbeddingFunction(
    model_name="paraphrase-multilingual-MiniLM-L12-v2"
)
collection = client.get_or_create_collection(
    name="coba",
    embedding_function=embedder
)

collection.add(
    documents=["Tutorial jaringan LAN...", "Konfigurasi ESP32..."],
    metadatas=[{"source": "internal"}, {"source": "internal"}],
    ids=["doc1", "doc2"]
)

results = collection.query(
    query_texts=["mikrokontroller"],
    n_results=2
)

print(results)