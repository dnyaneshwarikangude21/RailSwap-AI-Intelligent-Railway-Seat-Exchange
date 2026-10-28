import json
import threading
from pathlib import Path

from flask import current_app, has_app_context

from backend.ml import MODEL_SCHEMA_VERSION
from backend.ml.features import FEATURE_COLUMNS

try:
    import joblib
    import pandas as pd
except ImportError:  # pragma: no cover - surfaced as a safe fallback at runtime
    joblib = None
    pd = None

DEFAULT_MODEL_PATH = (
    Path(__file__).resolve().parent.parent
    / "ml"
    / "saved_models"
    / "railswap_compatibility_rf.joblib"
)


class MLService:
    """Lazily loads a persisted scikit-learn model.

    The service never trains during an API request. If an artifact is missing
    or incompatible, callers can safely continue with the deterministic engine.
    """

    def __init__(self):
        self._model = None
        self._feature_names = None
        self._metadata = {}
        self._load_error = None
        self._loaded_path = None
        self._load_attempted = False
        self._lock = threading.Lock()

    def reset(self):
        with self._lock:
            self._model = None
            self._feature_names = None
            self._metadata = {}
            self._load_error = None
            self._loaded_path = None
            self._load_attempted = False

    def _configured_path(self):
        if has_app_context():
            configured = current_app.config.get("ML_MODEL_PATH")
            if configured:
                return Path(configured)
        return DEFAULT_MODEL_PATH

    def _load(self):
        path = self._configured_path()
        with self._lock:
            if self._load_attempted and self._loaded_path == path:
                return
            self._load_attempted = True
            self._loaded_path = path
            self._model = None
            self._metadata = {}
            self._load_error = None

            if joblib is None or pd is None:
                self._load_error = "joblib or pandas is not installed"
                return
            if not path.exists():
                self._load_error = (
                    "Trained model artifact not found. Using deterministic fallback."
                )
                return
            try:
                artifact = joblib.load(path)
                if isinstance(artifact, dict):
                    model = artifact.get("pipeline") or artifact.get("model")
                    feature_names = artifact.get("feature_names")
                    metadata = artifact.get("metadata") or {}
                    schema_version = artifact.get("schema_version")
                else:
                    model = artifact
                    feature_names = None
                    metadata = {}
                    schema_version = None

                if model is None:
                    raise ValueError("artifact does not contain a model pipeline")
                if schema_version and schema_version != MODEL_SCHEMA_VERSION:
                    raise ValueError("model schema version is incompatible")
                if feature_names is None:
                    feature_names = getattr(model, "feature_names_in_", None)
                if feature_names is None:
                    feature_names = FEATURE_COLUMNS
                if list(feature_names) != FEATURE_COLUMNS:
                    raise ValueError("model feature schema does not match the application")

                self._model = model
                self._feature_names = list(feature_names)
                self._metadata = metadata
            except Exception as exc:  # noqa: BLE001 - safe fail-closed fallback
                self._load_error = f"Model could not be loaded: {type(exc).__name__}"
                self._model = None

    @property
    def available(self):
        self._load()
        return self._model is not None

    def status(self):
        self._load()
        path = self._loaded_path or self._configured_path()
        return {
            "available": self._model is not None,
            "mode": "ml" if self._model is not None else "rule_based_fallback",
            "model_path": str(path) if path else None,
            "artifact_present": bool(path and path.exists()),
            "fallback_reason": self._load_error,
            "metadata": self._metadata,
            "disclaimer": (
                "The model learns synthetic compatibility labels and does not "
                "predict real passenger acceptance or official railway approval."
            ),
        }

    def predict(self, features):
        self._load()
        if self._model is None:
            return None
        try:
            vector = pd.DataFrame(
                [[float(features.get(name, 0.0)) for name in FEATURE_COLUMNS]],
                columns=FEATURE_COLUMNS,
            )
            probabilities = self._model.predict_proba(vector)[0]
            classes = list(self._model.classes_)
            positive_index = classes.index(1)
            return round(float(probabilities[positive_index]), 4)
        except Exception as exc:  # noqa: BLE001 - inference must not break matching
            self._load_error = f"Inference failed: {type(exc).__name__}"
            return None

    def metrics(self):
        if has_app_context():
            path = Path(
                current_app.config.get(
                    "ML_METRICS_PATH",
                    Path(__file__).resolve().parent.parent
                    / "ml"
                    / "saved_models"
                    / "evaluation_metrics.json",
                )
            )
        else:
            path = (
                Path(__file__).resolve().parent.parent
                / "ml"
                / "saved_models"
                / "evaluation_metrics.json"
            )
        if not path.exists():
            return {
                "available": False,
                "reason": (
                    "No evaluation report found. Run the dataset, training, and "
                    "evaluation scripts."
                ),
                "expected_path": str(path),
            }
        try:
            with path.open("r", encoding="utf-8") as handle:
                metrics = json.load(handle)
            metrics["available"] = True
            return metrics
        except (OSError, json.JSONDecodeError) as exc:
            return {
                "available": False,
                "reason": f"Evaluation report could not be read: {type(exc).__name__}",
                "expected_path": str(path),
            }


ml_service = MLService()
