# Isi file: config/settings.py
import os
from pathlib import Path

from dotenv import load_dotenv

# Cara 1
current_file = Path(__file__).resolve()
ROOT_DIR = current_file.parent.parent.parent.parent

# Cara 2
# ROOT_DIR = here()

load_dotenv(ROOT_DIR / ".env")

# API Key
HF_TOKEN = os.getenv("HF_TOKEN")
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM")
MODEL_GEN_GEMINI_API_KEY = os.getenv("MODEL_GEN_GEMINI_API_KEY")

# Konstanta Sistem (Aman dijadikan global karena tidak berubah per user)
URL_MAIN = os.getenv("URL_MAIN")
URL_LOGIN = os.getenv("URL_LOGIN")
URL_ARTICLE_LIST = os.getenv("URL_ARTICLE_LIST")
URL_ARTICLE_CONTENT = os.getenv("URL_ARTICLE_CONTENT")

# Parameter Aplikasi Tetap
ORG_CODE = os.getenv("ORG_CODE")
APP_VERSION = "1.0"
DEVICE = "web"
PLATFORM = "saas"

# Path
DB_CHROMA_PATH = str(ROOT_DIR / os.getenv("DB_CHROMA_PATH", "data/chroma_db"))
FOLDER_GENERATION_DATA_PATH = str(
    ROOT_DIR / os.getenv("FOLDER_GENERATION_DATA_PATH", "data/generation")
)
FILE_LIST_PATH = str(
    ROOT_DIR / os.getenv("FILE_LIST_PATH", "data/scraping/article_list.json")
)
FILE_CONTENT_PATH = str(
    ROOT_DIR / os.getenv("FILE_CONTENT_PATH", "data/scraping/article_content.json")
)
FILE_READY_DATA_PATH = str(
    ROOT_DIR / os.getenv("FILE_READY_DATA_PATH", "data/scraping/ready_data.csv")
)
FILE_TOPIC_DATA_PATH = str(
    ROOT_DIR / os.getenv("FILE_TOPIC_DATA_PATH", "data/clustering/topic_data.json")
)
FILE_CLUSTERING_DATA_PATH = str(
    ROOT_DIR
    / os.getenv("FILE_CLUSTERING_DATA_PATH", "data/clustering/clustering_data.csv")
)
FILE_METADATA_GENERATED_ARTICLE_PATH = str(
    ROOT_DIR
    / os.getenv("FILE_METADATA_GENERATED_ARTICLE_PATH", "data/generation/metadata.json")
)
# print(file_ready_data_path)

# Name
DB_NAME = os.getenv("DB_NAME", "agc_db")
MODEL_EMBEDDING_NAME = os.getenv("MODEL_EMBEDDING_NAME")
MYDIGILEARN_TOKEN_NAME = os.getenv("MYDIGILEARN_TOKEN_NAME")
AGC_TOKEN_NAME = os.getenv("AGC_TOKEN_NAME")

BASE_HEADERS = {
    "accept": "application/json, text/plain, */*",
    "dnt": "1",
    "origin": URL_MAIN,
    "priority": "u=1, i",
    "referer": f"{URL_MAIN}/",
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": "Windows",
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-site",
    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/147.0.0.0 Safari/537.36",
}

BASE_CREDENTIALS = {
    "type": "sso",
    "org_code": ORG_CODE,
    "app_version": APP_VERSION,
    "device": DEVICE,
    "platform": PLATFORM,
}
