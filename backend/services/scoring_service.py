from backend.constants import SCORE_WEIGHTS
from backend.ml.features import FEATURE_LABELS


def clamp_unit(value):
    return max(0.0, min(1.0, float(value)))


def directional_satisfaction(current_type, desired_type):
    if not current_type or not desired_type:
        return 0.0
    return 1.0 if current_type == desired_type else 0.0


def preference_compatibility(requester_booking, candidate_booking):
    requester_score = directional_satisfaction(
        candidate_booking.berth.berth_type
        if candidate_booking and candidate_booking.berth
        else None,
        requester_booking.preference.desired_berth_type
        if requester_booking and requester_booking.preference
        else None,
    )
    candidate_score = directional_satisfaction(
        requester_booking.berth.berth_type
        if requester_booking and requester_booking.berth
        else None,
        candidate_booking.preference.desired_berth_type
        if candidate_booking and candidate_booking.preference
        else None,
    )
    return clamp_unit((requester_score + candidate_score) / 2.0)


def coach_compatibility(requester_booking, candidate_booking):
    if not requester_booking.coach or not candidate_booking.coach:
        return 0.0
    if requester_booking.coach.id == candidate_booking.coach.id:
        return 1.0
    return 0.65


def berth_proximity(requester_booking, candidate_booking):
    requester_coach = requester_booking.coach
    candidate_coach = candidate_booking.coach
    if not requester_coach or not candidate_coach:
        return 0.0
    max_berths = max(requester_coach.berth_count, candidate_coach.berth_count, 1)
    distance = abs(
        requester_booking.berth.berth_number - candidate_booking.berth.berth_number
    )
    proximity = clamp_unit(1.0 - (distance / max_berths))
    if requester_coach.id != candidate_coach.id:
        proximity *= 0.5
    return clamp_unit(proximity)


def build_feature_values(
    requester_booking,
    candidate_booking,
    eligibility_result,
):
    same_journey = (
        requester_booking.journey_id == candidate_booking.journey_id
    )
    valid_berth_pair = bool(
        requester_booking.berth
        and candidate_booking.berth
        and requester_booking.berth.berth_type
        and candidate_booking.berth.berth_type
    )
    return {
        "same_journey": 1.0 if same_journey else 0.0,
        "reciprocal_match": (
            1.0 if eligibility_result["reciprocal_satisfied"] else 0.0
        ),
        "preference_compatibility": preference_compatibility(
            requester_booking, candidate_booking
        ),
        "coach_compatibility": coach_compatibility(
            requester_booking, candidate_booking
        ),
        "berth_proximity": berth_proximity(requester_booking, candidate_booking),
        "valid_berth_pair": 1.0 if valid_berth_pair else 0.0,
        "journey_active": 1.0 if eligibility_result["journey_active"] else 0.0,
        "scope_satisfied": 1.0 if eligibility_result["scope_satisfied"] else 0.0,
    }


def score_features(features):
    contributions = []
    total = 0.0
    for key, weight in SCORE_WEIGHTS.items():
        value = clamp_unit(features.get(key, 0.0))
        points = value * weight * 100.0
        total += points
        contributions.append(
            {
                "feature": key,
                "label": FEATURE_LABELS.get(key, key),
                "value": round(value, 4),
                "weight": weight,
                "contribution": round(points, 2),
            }
        )
    return {
        "score": round(total, 2),
        "scale": "0-100 weighted baseline",
        "weights": dict(SCORE_WEIGHTS),
        "contributions": contributions,
        "note": (
            "Weights are illustrative configuration values completed before "
            "evaluation. The score is a ranking heuristic, not a probability "
            "that a real passenger will accept an exchange."
        ),
    }


def candidate_features(requester_booking, candidate_booking, eligibility_result):
    features = build_feature_values(
        requester_booking, candidate_booking, eligibility_result
    )
    return features, score_features(features)
