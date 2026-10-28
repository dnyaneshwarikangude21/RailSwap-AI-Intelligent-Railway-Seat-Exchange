"""Train and persist the experimental Random Forest compatibility model."""

import argparse
import json
import platform
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import sklearn
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.model_selection import GroupShuffleSplit
from sklearn.pipeline import Pipeline

from backend.ml.features import (
    FEATURE_COLUMNS,
    TARGET_COLUMN,
    TARGET_DESCRIPTION,
)
from backend.ml import MODEL_SCHEMA_VERSION

ML_DIR = Path(__file__).resolve().parent
DEFAULT_DATASET = ML_DIR / "data" / "synthetic_pairs.csv"
DEFAULT_MODEL = ML_DIR / "saved_models" / "railswap_compatibility_rf.joblib"
DEFAULT_METADATA = ML_DIR / "saved_models" / "training_metadata.json"
RANDOM_SEED = 42


def build_split(dataframe, test_size=0.25, random_state=RANDOM_SEED):
    groups = dataframe["group_id"].astype(str)
    splitter = GroupShuffleSplit(
        n_splits=1, test_size=test_size, random_state=random_state
    )
    train_index, test_index = next(
        splitter.split(dataframe[FEATURE_COLUMNS], dataframe[TARGET_COLUMN], groups)
    )
    return (
        dataframe.iloc[train_index].reset_index(drop=True),
        dataframe.iloc[test_index].reset_index(drop=True),
        sorted(groups.iloc[train_index].unique().tolist()),
        sorted(groups.iloc[test_index].unique().tolist()),
    )


def main():
    parser = argparse.ArgumentParser(
        description="Train the RailSwap AI synthetic compatibility model"
    )
    parser.add_argument("--dataset", type=Path, default=DEFAULT_DATASET)
    parser.add_argument("--model-output", type=Path, default=DEFAULT_MODEL)
    parser.add_argument("--metadata-output", type=Path, default=DEFAULT_METADATA)
    parser.add_argument("--test-size", type=float, default=0.25)
    parser.add_argument("--seed", type=int, default=RANDOM_SEED)
    args = parser.parse_args()

    if not args.dataset.exists():
        raise SystemExit(
            f"Dataset not found at {args.dataset}. Run "
            "`python -m backend.ml.generate_dataset` first."
        )

    dataframe = pd.read_csv(args.dataset)
    required = set(["pair_id", "group_id"] + FEATURE_COLUMNS + [TARGET_COLUMN])
    missing = required.difference(dataframe.columns)
    if missing:
        raise SystemExit(f"Dataset is missing columns: {sorted(missing)}")
    if dataframe[TARGET_COLUMN].nunique() < 2:
        raise SystemExit("The target column must contain both classes.")

    train_df, test_df, train_groups, test_groups = build_split(
        dataframe, test_size=args.test_size, random_state=args.seed
    )

    pipeline = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="median")),
            (
                "classifier",
                RandomForestClassifier(
                    n_estimators=240,
                    max_depth=10,
                    min_samples_leaf=3,
                    class_weight="balanced",
                    random_state=args.seed,
                    n_jobs=1,
                ),
            ),
        ]
    )
    pipeline.fit(train_df[FEATURE_COLUMNS], train_df[TARGET_COLUMN])

    args.model_output.parent.mkdir(parents=True, exist_ok=True)
    args.metadata_output.parent.mkdir(parents=True, exist_ok=True)
    trained_at = datetime.now(timezone.utc).isoformat()
    metadata = {
        "schema_version": MODEL_SCHEMA_VERSION,
        "trained_at_utc": trained_at,
        "dataset_path": str(args.dataset.resolve()),
        "row_count": int(len(dataframe)),
        "train_rows": int(len(train_df)),
        "test_rows": int(len(test_df)),
        "train_groups": len(train_groups),
        "test_groups": len(test_groups),
        "feature_columns": FEATURE_COLUMNS,
        "target_column": TARGET_COLUMN,
        "target_description": TARGET_DESCRIPTION,
        "label_source": "documented_synthetic_compatibility_rules",
        "model_type": "RandomForestClassifier",
        "model_parameters": {
            "n_estimators": 240,
            "max_depth": 10,
            "min_samples_leaf": 3,
            "class_weight": "balanced",
            "random_state": args.seed,
            "n_jobs": 1,
        },
        "random_seed": args.seed,
        "group_split": (
            "GroupShuffleSplit grouped by synthetic journey scenario to reduce "
            "near-duplicate leakage."
        ),
        "environment": {
            "python": platform.python_version(),
            "scikit_learn": sklearn.__version__,
            "numpy": np.__version__,
            "pandas": pd.__version__,
            "platform": platform.platform(),
        },
        "limitation": (
            "This model is trained on rule-derived synthetic labels. Metrics "
            "measure consistency with those labels and are not evidence of "
            "real-world passenger acceptance or railway approval."
        ),
    }

    artifact = {
        "pipeline": pipeline,
        "feature_names": FEATURE_COLUMNS,
        "schema_version": MODEL_SCHEMA_VERSION,
        "metadata": metadata,
    }
    joblib.dump(artifact, args.model_output)
    with args.metadata_output.open("w", encoding="utf-8") as handle:
        json.dump(metadata, handle, indent=2)

    print(f"Saved model artifact to {args.model_output}")
    print(f"Saved training metadata to {args.metadata_output}")
    print(
        f"Train rows: {len(train_df)} across {len(train_groups)} groups; "
        f"test rows: {len(test_df)} across {len(test_groups)} groups."
    )
    print(
        "Next: python -m backend.ml.evaluate_model to produce actual metrics."
    )


if __name__ == "__main__":
    main()
