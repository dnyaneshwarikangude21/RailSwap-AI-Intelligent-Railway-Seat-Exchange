FEATURE_COLUMNS = [
    "same_journey",
    "reciprocal_match",
    "preference_compatibility",
    "coach_compatibility",
    "berth_proximity",
    "valid_berth_pair",
    "journey_active",
    "scope_satisfied",
]

FEATURE_LABELS = {
    "same_journey": "Same journey",
    "reciprocal_match": "Reciprocal berth preference",
    "preference_compatibility": "Preference compatibility",
    "coach_compatibility": "Coach compatibility",
    "berth_proximity": "Berth proximity",
    "valid_berth_pair": "Valid berth records",
    "journey_active": "Upcoming journey",
    "scope_satisfied": "Coach scope satisfied",
}

TARGET_COLUMN = "synthetic_compatible"
TARGET_DESCRIPTION = (
    "1 when the synthetic pair satisfies all documented hard-eligibility "
    "criteria, otherwise 0. This is synthetic compatibility, not real-world "
    "passenger acceptance."
)
