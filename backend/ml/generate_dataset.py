"""Generate a synthetic pairwise candidate dataset.

The target is a documented rule-derived label, not observed passenger
acceptance. Group identifiers are retained solely for leak-resistant splitting.
"""

import argparse
from pathlib import Path

import numpy as np
import pandas as pd

from backend.ml.features import FEATURE_COLUMNS, TARGET_COLUMN

ML_DIR = Path(__file__).resolve().parent
DEFAULT_OUTPUT = ML_DIR / "data" / "synthetic_pairs.csv"
RANDOM_SEED = 42


def generate_dataset(n_groups=360, pairs_per_group=12, seed=RANDOM_SEED):
    rng = np.random.default_rng(seed)
    rows = []
    pair_counter = 0

    for group_number in range(n_groups):
        group_id = f"scenario-{group_number:04d}"
        # Each group represents one synthetic journey scenario. Generating
        # several near-related pairs per group lets the split remain group-aware.
        for pair_in_group in range(pairs_per_group):
            pair_counter += 1
            same_journey = int(rng.random() < 0.90)
            reciprocal_match = int(rng.random() < 0.55)
            if reciprocal_match:
                preference_compatibility = float(rng.uniform(0.72, 1.0))
            else:
                preference_compatibility = float(rng.uniform(0.0, 0.65))

            if rng.random() < 0.63:
                coach_compatibility = 1.0
            else:
                coach_compatibility = float(rng.uniform(0.30, 0.80))

            berth_proximity = float(rng.uniform(0.0, 1.0))
            valid_berth_pair = int(rng.random() < 0.97)
            journey_active = int(rng.random() < 0.95)
            scope_satisfied = int(rng.random() < 0.95)

            # Documented synthetic rule. This target intentionally mirrors the
            # hard eligibility policy, so high metrics demonstrate implementation
            # consistency rather than real-world predictive validity.
            synthetic_compatible = int(
                same_journey == 1
                and reciprocal_match == 1
                and preference_compatibility >= 0.60
                and coach_compatibility >= 0.50
                and valid_berth_pair == 1
                and journey_active == 1
                and scope_satisfied == 1
            )

            row = {
                "pair_id": f"pair-{pair_counter:06d}",
                "group_id": group_id,
                "pair_in_group": pair_in_group,
                "same_journey": same_journey,
                "reciprocal_match": reciprocal_match,
                "preference_compatibility": round(preference_compatibility, 6),
                "coach_compatibility": round(coach_compatibility, 6),
                "berth_proximity": round(berth_proximity, 6),
                "valid_berth_pair": valid_berth_pair,
                "journey_active": journey_active,
                "scope_satisfied": scope_satisfied,
                TARGET_COLUMN: synthetic_compatible,
            }
            rows.append(row)

    dataframe = pd.DataFrame(rows)
    ordered_columns = (
        ["pair_id", "group_id", "pair_in_group"] + FEATURE_COLUMNS + [TARGET_COLUMN]
    )
    return dataframe[ordered_columns]


def main():
    parser = argparse.ArgumentParser(
        description="Generate the RailSwap AI synthetic ML dataset"
    )
    parser.add_argument("--groups", type=int, default=360)
    parser.add_argument("--pairs-per-group", type=int, default=12)
    parser.add_argument("--seed", type=int, default=RANDOM_SEED)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()

    if args.groups < 2:
        parser.error("--groups must be at least 2")
    if args.pairs_per_group < 1:
        parser.error("--pairs-per-group must be at least 1")

    output = args.output
    output.parent.mkdir(parents=True, exist_ok=True)
    dataframe = generate_dataset(
        n_groups=args.groups,
        pairs_per_group=args.pairs_per_group,
        seed=args.seed,
    )
    dataframe.to_csv(output, index=False)
    positive_count = int(dataframe[TARGET_COLUMN].sum())
    total = len(dataframe)
    print(f"Wrote {total} synthetic pairs to {output}")
    print(
        f"Target distribution: {positive_count} compatible "
        f"({positive_count / total:.2%}), {total - positive_count} incompatible"
    )
    print(
        "Reminder: the target is rule-derived synthetic compatibility, "
        "not real passenger acceptance."
    )


if __name__ == "__main__":
    main()
