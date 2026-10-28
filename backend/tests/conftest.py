from pathlib import Path

import pytest

from backend import create_app
from backend.config import Config
from backend.extensions import db
from backend.services.ml_service import ml_service


@pytest.fixture
def app(tmp_path):
    database_path = tmp_path / "test_railswap.db"
    missing_model = tmp_path / "missing_model.joblib"
    missing_metrics = tmp_path / "missing_metrics.json"

    class TestConfig(Config):
        TESTING = True
        AUTO_CREATE_DB = True
        SECRET_KEY = "test-secret-key-at-least-32-bytes-long"
        JWT_SECRET_KEY = "test-jwt-secret-key-at-least-32-bytes-long"
        SQLALCHEMY_DATABASE_URI = f"sqlite:///{database_path.as_posix()}"
        SQLALCHEMY_ENGINE_OPTIONS = {}
        ML_MODEL_PATH = str(missing_model)
        ML_METRICS_PATH = str(missing_metrics)
        CORS_ORIGINS = ["http://localhost:5173"]

    application = create_app(TestConfig)
    yield application
    with application.app_context():
        db.session.remove()
        db.drop_all()


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture(autouse=True)
def reset_ml_cache():
    ml_service.reset()
    yield
    ml_service.reset()


@pytest.fixture
def artifact_paths():
    base = Path(__file__).resolve().parent.parent / "ml" / "saved_models"
    return {
        "model": base / "railswap_compatibility_rf.joblib",
        "metrics": base / "evaluation_metrics.json",
    }
