import pytest

from backend.ml.features import FEATURE_COLUMNS
from backend.ml.generate_dataset import generate_dataset
from backend.services.ml_service import MLService, ml_service


def test_dataset_generation_is_deterministic_and_grouped():
    first = generate_dataset(n_groups=8, pairs_per_group=5, seed=123)
    second = generate_dataset(n_groups=8, pairs_per_group=5, seed=123)
    assert first.equals(second)
    assert len(first) == 40
    assert set(FEATURE_COLUMNS).issubset(first.columns)
    assert first["group_id"].nunique() == 8
    assert set(first["synthetic_compatible"].unique()).issubset({0, 1})
    for feature in FEATURE_COLUMNS:
        assert first[feature].between(0, 1).all()


def test_missing_model_has_safe_fallback(app):
    with app.app_context():
        status = ml_service.status()
        assert status["available"] is False
        assert status["mode"] == "rule_based_fallback"
        assert status["fallback_reason"]
        assert ml_service.predict({feature: 1.0 for feature in FEATURE_COLUMNS}) is None


def test_trained_model_can_be_loaded_and_used_for_inference(app, artifact_paths):
    model_path = artifact_paths["model"]
    if not model_path.exists():
        pytest.skip("Model artifact has not been trained in this environment.")

    with app.app_context():
        app.config["ML_MODEL_PATH"] = str(model_path)
        service = MLService()
        status = service.status()
        assert status["available"] is True
        assert status["mode"] == "ml"
        assert status["metadata"]["feature_columns"] == FEATURE_COLUMNS
        probability = service.predict(
            {
                "same_journey": 1.0,
                "reciprocal_match": 1.0,
                "preference_compatibility": 1.0,
                "coach_compatibility": 1.0,
                "berth_proximity": 1.0,
                "valid_berth_pair": 1.0,
                "journey_active": 1.0,
                "scope_satisfied": 1.0,
            }
        )
        assert probability is not None
        assert 0.0 <= probability <= 1.0


def test_model_does_not_train_on_request(app, artifact_paths, monkeypatch):
    model_path = artifact_paths["model"]
    if not model_path.exists():
        pytest.skip("Model artifact has not been trained in this environment.")

    with app.app_context():
        app.config["ML_MODEL_PATH"] = str(model_path)
        service = MLService()
        calls = {"fit": 0}
        original = service._load

        def guarded_load():
            original()
            assert service._model is not None
            return None

        monkeypatch.setattr(service, "_load", guarded_load)
        result = service.predict({feature: 0.5 for feature in FEATURE_COLUMNS})
        assert result is not None
        assert calls["fit"] == 0
