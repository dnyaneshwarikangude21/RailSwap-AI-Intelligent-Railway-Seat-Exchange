"""Evaluate the persisted model and a transparent rule baseline.

Writes actual results to saved_models/evaluation_metrics.json for the API's
ML analytics page. No metrics are fabricated or hardcoded.
"""

import argparse
import json
import time
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
)

from backend.constants import SCORE_WEIGHTS
from backend.ml.features import (
    FEATURE_COLUMNS,
    TARGET_COLUMN,
    TARGET_DESCRIPTION,
)
from backend.ml.train_model import build_split

ML_DIR = Path(__file__).resolve().parent
DEFAULT_DATASET = ML_DIR / "data" / "synthetic_pairs.csv"
DEFAULT_MODEL = ML_DIR / "saved_models" / "railswap_compatibility_rf.joblib"
DEFAULT_METRICS = ML_DIR / "saved_models" / "evaluation_metrics.json"
RANDOM_SEED = 42
K = 5


def baseline_predictions(dataframe):
    return (
        (dataframe["same_journey"] == 1)
        & (dataframe["reciprocal_match"] == 1)
        & (dataframe["preference_compatibility"] >= 0.60)
        & (dataframe["coach_compatibility"] >= 0.50)
        & (dataframe["valid_berth_pair"] == 1)
        & (dataframe["journey_active"] == 1)
        & (dataframe["scope_satisfied"] == 1)
    ).astype(int)


def baseline_score(dataframe):
    total = np.zeros(len(dataframe), dtype=float)
    for feature, weight in SCORE_WEIGHTS.items():
        total += dataframe[feature].to_numpy(dtype=float) * weight * 100.0
    return total


def classification_metrics(y_true, y_pred):
    return {
        "accuracy": round(float(accuracy_score(y_true, y_pred)), 4),
        "precision": round(float(precision_score(y_true, y_pred, zero_division=0)), 4),
        "recall": round(float(recall_score(y_true, y_pred, zero_division=0)), 4),
        "f1": round(float(f1_score(y_true, y_pred, zero_division=0)), 4),
        "confusion_matrix": confusion_matrix(y_true, y_pred, labels=[0, 1]).tolist(),
        "classification_report": classification_report(
            y_true, y_pred, output_dict=True, zero_division=0
        ),
    }


def precision_at_k(dataframe, scores, k=K):
    frame = dataframe.copy()
    frame["_score"] = scores
    precisions = []
    for _group_id, group in frame.groupby("group_id", sort=True):
        if len(group) == 0:
            continue
        top = group.sort_values(
            by=["_score", "pair_id"], ascending=[False, True]
        ).head(k)
        precisions.append(float(top[TARGET_COLUMN].mean()))
    return {
        "k": k,
        "mean_precision_at_k": round(float(np.mean(precisions)), 4)
        if precisions
        else None,
        "groups_evaluated": len(precisions),
        "note": (
            "Per-scenario precision among the top-k synthetic candidates, "
            "averaged equally across test scenarios."
        ),
    }


def main():
    parser = argparse.ArgumentParser(
        description="Evaluate the RailSwap AI model and rule baseline"
    )
    parser.add_argument("--dataset", type=Path, default=DEFAULT_DATASET)
    parser.add_argument("--model", type=Path, default=DEFAULT_MODEL)
    parser.add_argument("--output", type=Path, default=DEFAULT_METRICS)
    parser.add_argument("--seed", type=int, default=RANDOM_SEED)
    args = parser.parse_args()

    if not args.dataset.exists():
        raise SystemExit(
            f"Dataset not found at {args.dataset}. Run dataset generation first."
        )
    if not args.model.exists():
        raise SystemExit(
            f"Model artifact not found at {args.model}. Run training first."
        )

    dataframe = pd.read_csv(args.dataset)
    _train_df, test_df, _train_groups, _test_groups = build_split(
        dataframe, random_state=args.seed
    )
    artifact = joblib.load(args.model)
    if isinstance(artifact, dict):
        pipeline = artifact["pipeline"]
        saved_features = artifact.get("feature_names", FEATURE_COLUMNS)
    else:
        pipeline = artifact
        saved_features = FEATURE_COLUMNS
    if list(saved_features) != FEATURE_COLUMNS:
        raise SystemExit("Saved model feature schema does not match this dataset.")

    y_true = test_df[TARGET_COLUMN].astype(int).to_numpy()
    ml_probabilities = pipeline.predict_proba(test_df[FEATURE_COLUMNS])[:, 1]
    ml_predictions = (ml_probabilities >= 0.50).astype(int)
    rule_predictions = baseline_predictions(test_df).to_numpy()
    rule_scores = baseline_score(test_df)

    ml_metrics = classification_metrics(y_true, ml_predictions)
    baseline_metrics = classification_metrics(y_true, rule_predictions)
    ml_precision_at_k = precision_at_k(test_df, ml_probabilities, K)
    baseline_precision_at_k = precision_at_k(test_df, rule_scores, K)

    # Warm up once, then time single-row inference.
    sample = test_df[FEATURE_COLUMNS].iloc[[0]]
    pipeline.predict_proba(sample)
    timings = []
    for _ in range(300):
        start = time.perf_counter()
        pipeline.predict_proba(sample)
        timings.append((time.perf_counter() - start) * 1000.0)
    latency = {
        "samples": len(timings),
        "mean_ms": round(float(np.mean(timings)), 4),
        "median_ms": round(float(np.median(timings)), 4),
        "p95_ms": round(float(np.percentile(timings, 95)), 4),
        "note": "Single-row, single-process local measurement after warm-up.",
    }

    classifier = pipeline.named_steps["classifier"]
    feature_importance = sorted(
        [
            {"feature": feature, "importance": round(float(importance), 4)}
            for feature, importance in zip(
                FEATURE_COLUMNS, classifier.feature_importances_
            )
        ],
        key=lambda item: item["importance"],
        reverse=True,
    )

    report = {
        "available": True,
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "dataset": {
            "path": str(args.dataset.resolve()),
            "rows": int(len(dataframe)),
            "test_rows": int(len(test_df)),
            "test_groups": int(test_df["group_id"].nunique()),
            "features": FEATURE_COLUMNS,
            "target": TARGET_COLUMN,
            "target_description": TARGET_DESCRIPTION,
            "test_positive_rate": round(float(y_true.mean()), 4),
        },
        "model": {
            "artifact": str(args.model.resolve()),
            "type": "RandomForestClassifier",
            "feature_importance": feature_importance,
        },
        "ml": {
            **ml_metrics,
            "precision_at_k": ml_precision_at_k,
        },
        "rule_baseline": {
            **baseline_metrics,
            "precision_at_k": baseline_precision_at_k,
            "definition": (
                "Predict compatible if same_journey, reciprocal_match, "
                "preference_compatibility >= 0.60, coach_compatibility >= 0.50, "
                "valid_berth_pair, journey_active, and scope_satisfied all hold. "
                "Rank candidates by the transparent weighted score."
            ),
        },
        "inference_latency": latency,
        "comparison": {
            "f1_delta_ml_minus_baseline": round(
                ml_metrics["f1"] - baseline_metrics["f1"], 4
            ),
            "precision_at_k_delta_ml_minus_baseline": round(
                ml_precision_at_k["mean_precision_at_k"]
                - baseline_precision_at_k["mean_precision_at_k"],
                4,
            ),
        },
        "limitations": [
            "The target is generated from documented synthetic rules, not real passenger acceptance.",
            "Features overlap with the labeling rules, so high metrics measure implementation consistency.",
            "The synthetic distribution is artificial and does not represent a real railway passenger population.",
            "This experiment does not establish causal or real-world effectiveness.",
            "Precision@K averages equally across synthetic scenarios and is not an operational acceptance metric.",
        ],
        "reproducibility": {
            "random_seed": args.seed,
            "split": "GroupShuffleSplit on group_id with test_size=0.25",
            "train_command": "python -m backend.ml.train_model",
            "evaluate_command": "python -m backend.ml.evaluate_model",
        },
    }

    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open("w", encoding="utf-8") as handle:
        json.dump(report, handle, indent=2)

    print(f"Wrote evaluation report to {args.output}")
    print(
        "ML: "
        f"precision={ml_metrics['precision']:.4f}, "
        f"recall={ml_metrics['recall']:.4f}, f1={ml_metrics['f1']:.4f}"
    )
    print(
        "Baseline: "
        f"precision={baseline_metrics['precision']:.4f}, "
        f"recall={baseline_metrics['recall']:.4f}, f1={baseline_metrics['f1']:.4f}"
    )
    print(
        f"Precision@{K}: "
        f"ML={ml_precision_at_k['mean_precision_at_k']}, "
        f"baseline={baseline_precision_at_k['mean_precision_at_k']}"
    )
    print(
        f"Mean inference latency: {latency['mean_ms']:.4f} ms, "
        f"p95: {latency['p95_ms']:.4f} ms"
    )
    print(
        "Reminder: these are synthetic-label consistency metrics, not "
        "real-world acceptance metrics."
    )


if __name__ == "__main__":
    main()
