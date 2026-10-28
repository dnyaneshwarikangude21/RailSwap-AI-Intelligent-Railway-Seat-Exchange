import os
from datetime import timedelta
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")


def _default_database_uri() -> str:
    instance_dir = Path(__file__).resolve().parent / "instance"
    instance_dir.mkdir(parents=True, exist_ok=True)
    return f"sqlite:///{(instance_dir / 'railswap.db').as_posix()}"


def _cors_origins() -> list[str]:
    raw = os.environ.get(
        "CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
    )
    return [origin.strip() for origin in raw.split(",") if origin.strip()]


class Config:
    SECRET_KEY = os.environ.get(
        "SECRET_KEY", "dev-only-change-this-secret-key-before-deployment"
    )
    JWT_SECRET_KEY = os.environ.get(
        "JWT_SECRET_KEY", "dev-only-change-this-jwt-secret-key-before-deployment"
    )
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(
        hours=int(os.environ.get("JWT_ACCESS_TOKEN_HOURS", "12"))
    )
    JWT_TOKEN_LOCATION = ["headers"]
    JWT_HEADER_TYPE = "Bearer"

    SQLALCHEMY_DATABASE_URI = os.environ.get("DATABASE_URL") or _default_database_uri()
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {"pool_pre_ping": True}

    CORS_ORIGINS = _cors_origins()
    AUTO_CREATE_DB = os.environ.get("AUTO_CREATE_DB", "true").lower() == "true"
    JSON_SORT_KEYS = False

    ML_MODEL_PATH = os.environ.get("ML_MODEL_PATH") or str(
        Path(__file__).resolve().parent
        / "ml"
        / "saved_models"
        / "railswap_compatibility_rf.joblib"
    )
    ML_METRICS_PATH = os.environ.get("ML_METRICS_PATH") or str(
        Path(__file__).resolve().parent
        / "ml"
        / "saved_models"
        / "evaluation_metrics.json"
    )
    MATCHING_RESULT_LIMIT = int(os.environ.get("MATCHING_RESULT_LIMIT", "20"))
    MAX_ACTIVE_MATCHES = int(os.environ.get("MAX_ACTIVE_MATCHES", "5"))


class TestingConfig(Config):
    TESTING = True
    AUTO_CREATE_DB = True
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=1)
    CORS_ORIGINS = ["http://localhost:5173"]
    SECRET_KEY = "test-secret-key-at-least-32-bytes-long"
    JWT_SECRET_KEY = "test-jwt-secret-key-at-least-32-bytes-long"
