# Isi file: schemas/payload.py
from pydantic import BaseModel, Field
from typing import Optional

class LoginCredentials(BaseModel):
    username: str
    password: str
    # org_code tidak perlu dimasukkan jika itu statis milik sistemmu

class EmbeddingModelConfig(BaseModel):
    model_name: str = Field("paraphrase-multilingual-MiniLM-L12-v2") 
    token: str = Field("")

class UMAPConfig(BaseModel):
    n_neighbors: int = Field(10) 
    n_components: int = Field(5) 
    min_dist: float = Field(0.0)
    metric: str = Field("cosine")
    random_state: int = Field(42)

class HDBSCANConfig(BaseModel):
    min_cluster_size: int = Field(4)
    min_samples: int = Field(2)
    metric: str = Field("euclidean") 
    cluster_selection_method: str = Field("eom") 
    prediction_data: bool = Field(True)

class VectorizerConfig(BaseModel):
    ngram_range: tuple[int, int] = Field(default=(1, 6))
    min_df: float = Field(default=5)

class CTFIDFConfig(BaseModel):
    bm25_weighting: bool = Field(True) 
    reduce_frequent_words: bool = Field(True)

class ClusteringPayload(BaseModel):
    embedding_model_config: EmbeddingModelConfig = EmbeddingModelConfig()
    umap_config: UMAPConfig = UMAPConfig()
    hdbscan_config: HDBSCANConfig = HDBSCANConfig()
    vectorizer_config: VectorizerConfig = VectorizerConfig()
    ctfidf_config: CTFIDFConfig = CTFIDFConfig()

class GenerationPayload(BaseModel):
    selected_topics: list[str] = Field(["Kondisi Ekonomi", "Ekonomi"], description="Daftar topik yang dipilih pengguna")
    keywords: list[str] = Field(["Ekonomi", "Kondisi Ekonomi", "Biaya Hidup"], description="Daftar kata kunci untuk memandu artikel")
    prompt: str = Field("Fokuskan pada dampak ekonomi sirkular bagi UMKM lokal", description="Instruksi spesifik atau fokus artikel")
    model: str = Field("gemini-3-flash-preview", description="Nama model AI yang digunakan")
    model_api_key: str = Field("...", description="api key untuk model gemini")