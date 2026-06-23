# Isi file: schemas/payload.py

from pydantic import BaseModel, Field


class LoginCredentials(BaseModel):
    username: str
    password: str
    # org_code tidak perlu dimasukkan jika itu statis milik sistemmu


class EmbeddingModelConfig(BaseModel):
    model_name: str = Field(default="paraphrase-multilingual-MiniLM-L12-v2")
    token: str = Field("")


class UMAPConfig(BaseModel):
    n_neighbors: int = Field(default=10)
    n_components: int = Field(default=5)
    min_dist: float = Field(default=0.0)
    metric: str = Field(default="cosine")
    random_state: int = Field(default=42)


class HDBSCANConfig(BaseModel):
    min_cluster_size: int = Field(default=4)
    min_samples: int = Field(default=2)
    metric: str = Field(default="euclidean")
    cluster_selection_method: str = Field(default="eom")
    prediction_data: bool = Field(default=True)


class VectorizerConfig(BaseModel):
    ngram_range: tuple[int, int] = Field(default=(1, 6))
    min_df: float = Field(default=5)


class CTFIDFConfig(BaseModel):
    bm25_weighting: bool = Field(default=True)
    reduce_frequent_words: bool = Field(default=True)


class ScrapPayload(BaseModel):
    mode: str = (Field("both"),)
    max_scrap: int = (Field(10),)
    overlap_limit: int = (Field(10),)
    page: int = (Field(1),)
    limit_article_per_page: int = (Field(10),)


class ClusterPayload(BaseModel):
    days_ago: int = Field(0)
    recommend_target: int = Field(3)
    min_cf_range: float = Field(0.5)
    embedding_model_config: EmbeddingModelConfig = EmbeddingModelConfig()
    umap_config: UMAPConfig = UMAPConfig()
    hdbscan_config: HDBSCANConfig = HDBSCANConfig()
    vectorizer_config: VectorizerConfig = VectorizerConfig()
    ctfidf_config: CTFIDFConfig = CTFIDFConfig()


class GeneratePayload(BaseModel):
    topics: list[str] = Field(
        ["Kondisi Ekonomi", "Ekonomi"], description="Daftar topik yang dipilih pengguna"
    )
    keywords: list[str] = Field(
        ["Ekonomi", "Kondisi Ekonomi", "Biaya Hidup"],
        description="Daftar kata kunci untuk memandu artikel",
    )

    prompt_system: str = Field(
        """Bertindaklah sebagai Jurnalis atau pembuat artikel yang ahli.
      Tuliskan 1 artikel edukasi berdasarkan informasi berikut:
      - Topik Utama: Ekonomi
      - Kata Kunci yang WAJIB dibahas: Ekonomi

      ATURAN MUTLAK FORMAT OUTPUT:
      - Kamu WAJIB mengembalikan jawaban HANYA dalam format JSON yang valid.
      - Struktur JSON harus memiliki persis 2 key: "title" dan "content".
      - Key "title" berisi teks judul artikel murni.
      - Key "content" berisi isi artikel "
      "dalam format Markdown Dasar yang disederhanakan (Minimal 2000 kata).

      ATURAN MARKDOWN UNTUK "content":
      - GUNAKAN **teks** untuk poin penting.
      - GUNAKAN # atau ## untuk subjudul.
      - GUNAKAN - untuk list bullet.
      - DIIZINKAN blockquote (>) MAKSIMAL 2 kali (untuk kutipan).
      - DILARANG menggunakan nested blockquote (>>).
      - DILARANG menggunakan nested list.""",
      description="Instruksi Untuk Sistem Gemini"
    )
    prompt_user: str = Field(
        "Fokuskan pada dampak ekonomi sirkular bagi UMKM lokal",
        description="Instruksi spesifik atau fokus artikel",
    )
    model: str = Field(
        "gemini-3-flash-preview", description="Nama model AI yang digunakan"
    )
    model_api_key: str = Field("...", description="api key untuk model gemini")
