from datetime import date

from sqlalchemy.orm import joinedload

from backend.constants import ACTIVE_EXCHANGE_STATUSES, BERTH_TYPES, SCORE_WEIGHTS
from backend.extensions import db
from backend.models import Berth, Booking, ExchangeRequest, Journey, Preference, Train
from backend.services.explanation_service import build_explanation
from backend.services.ml_service import ml_service
from backend.services.scoring_service import candidate_features
from backend.utils import isoformat, utcnow

APPLICATION_LIMITATIONS = [
    "Recommendations are application-level only and do not modify a railway reservation.",
    "This prototype uses synthetic data and simulated verification.",
    "An accepted request is not an official railway authorization.",
]


def active_booking_ids():
    rows = (
        db.session.query(
            ExchangeRequest.requester_booking_id,
            ExchangeRequest.recipient_booking_id,
        )
        .filter(ExchangeRequest.status.in_(ACTIVE_EXCHANGE_STATUSES))
        .all()
    )
    ids = set()
    for requester_id, recipient_id in rows:
        ids.add(requester_id)
        ids.add(recipient_id)
    return ids


def booking_has_active_exchange(booking_id):
    return (
        ExchangeRequest.query.filter(
            ExchangeRequest.status.in_(ACTIVE_EXCHANGE_STATUSES),
            db.or_(
                ExchangeRequest.requester_booking_id == booking_id,
                ExchangeRequest.recipient_booking_id == booking_id,
            ),
        ).first()
        is not None
    )


def _scope_ok(preference, own_coach_id, other_coach_id):
    if preference is None:
        return False
    if preference.coach_scope == "ANY":
        return True
    return own_coach_id == other_coach_id


def evaluate_candidate(
    requester_booking,
    candidate_booking,
    requester_preference=None,
    candidate_preference=None,
    blocked_booking_ids=None,
    today=None,
):
    today = today or date.today()
    blocked_booking_ids = blocked_booking_ids or set()
    requester_preference = requester_preference or requester_booking.preference
    candidate_preference = candidate_preference or candidate_booking.preference
    checks = []

    def add(code, label, passed, detail):
        checks.append(
            {
                "code": code,
                "label": label,
                "passed": bool(passed),
                "detail": detail,
            }
        )

    requester_exists = requester_booking is not None
    candidate_exists = candidate_booking is not None
    add(
        "bookings_exist",
        "Both bookings exist",
        requester_exists and candidate_exists,
        "Booking records were found."
        if requester_exists and candidate_exists
        else "At least one booking record is missing.",
    )

    distinct_bookings = bool(
        requester_exists
        and candidate_exists
        and requester_booking.id != candidate_booking.id
    )
    add(
        "distinct_bookings",
        "Different bookings",
        distinct_bookings,
        "The two sides are different bookings."
        if distinct_bookings
        else "A booking cannot be exchanged with itself.",
    )

    different_users = bool(
        requester_exists
        and candidate_exists
        and requester_booking.user_id != candidate_booking.user_id
    )
    add(
        "different_users",
        "Different passengers",
        different_users,
        "The candidate belongs to another passenger."
        if different_users
        else "You cannot request an exchange with your own booking.",
    )

    same_journey = bool(
        requester_exists
        and candidate_exists
        and requester_booking.journey_id == candidate_booking.journey_id
    )
    same_train = bool(
        same_journey
        and requester_booking.journey
        and candidate_booking.journey
        and requester_booking.journey.train_id == candidate_booking.journey.train_id
    )
    add(
        "same_journey",
        "Same journey and route",
        same_journey and same_train,
        "Both bookings are on the same synthetic journey and route."
        if same_journey and same_train
        else "Cross-journey exchanges are not supported in this version.",
    )

    journey_active = bool(
        requester_exists
        and candidate_exists
        and requester_booking.journey
        and requester_booking.journey.journey_date >= today
    )
    add(
        "journey_active",
        "Journey has not expired",
        journey_active,
        "The journey date is today or in the future."
        if journey_active
        else "The journey date has already passed.",
    )

    valid_berths = bool(
        requester_exists
        and candidate_exists
        and requester_booking.berth
        and candidate_booking.berth
        and requester_booking.berth.berth_type in BERTH_TYPES
        and candidate_booking.berth.berth_type in BERTH_TYPES
    )
    add(
        "valid_berths",
        "Valid berth records",
        valid_berths,
        "Both berth records use a supported berth type."
        if valid_berths
        else "One or both berth records are invalid.",
    )

    verified = bool(
        requester_exists
        and candidate_exists
        and requester_booking.verification_status == "SIMULATED_VERIFIED"
        and candidate_booking.verification_status == "SIMULATED_VERIFIED"
    )
    add(
        "simulated_verification",
        "Demo verification present",
        verified,
        "Both bookings have simulated demo verification."
        if verified
        else "Both bookings must have simulated demo verification.",
    )

    preferences_present = bool(requester_preference and candidate_preference)
    add(
        "preferences_present",
        "Both preferences are set",
        preferences_present,
        "Both passengers submitted berth preferences."
        if preferences_present
        else "The candidate or requester has no berth preference.",
    )

    requester_wants_candidate = bool(
        preferences_present
        and requester_booking.berth
        and candidate_booking.berth
        and requester_preference.desired_berth_type
        == candidate_booking.berth.berth_type
    )
    candidate_wants_requester = bool(
        preferences_present
        and requester_booking.berth
        and candidate_booking.berth
        and candidate_preference.desired_berth_type
        == requester_booking.berth.berth_type
    )
    add(
        "reciprocal_requester_side",
        "Your preferred berth is available",
        requester_wants_candidate,
        "The candidate currently occupies your preferred berth type."
        if requester_wants_candidate
        else "The candidate does not occupy your preferred berth type.",
    )
    add(
        "reciprocal_candidate_side",
        "Candidate's preferred berth is available",
        candidate_wants_requester,
        "You currently occupy the candidate's preferred berth type."
        if candidate_wants_requester
        else "You do not occupy the candidate's preferred berth type.",
    )

    requester_scope_ok = bool(
        preferences_present
        and requester_booking.coach
        and candidate_booking.coach
        and _scope_ok(
            requester_preference,
            requester_booking.coach.id,
            candidate_booking.coach.id,
        )
    )
    candidate_scope_ok = bool(
        preferences_present
        and requester_booking.coach
        and candidate_booking.coach
        and _scope_ok(
            candidate_preference,
            candidate_booking.coach.id,
            requester_booking.coach.id,
        )
    )
    add(
        "requester_coach_scope",
        "Your coach scope is satisfied",
        requester_scope_ok,
        "Your coach preference allows this pairing."
        if requester_scope_ok
        else "This pairing is outside your selected coach scope.",
    )
    add(
        "candidate_coach_scope",
        "Candidate coach scope is satisfied",
        candidate_scope_ok,
        "The candidate's coach scope allows this pairing."
        if candidate_scope_ok
        else "This pairing is outside the candidate's selected coach scope.",
    )

    requester_not_blocked = bool(
        requester_exists and requester_booking.id not in blocked_booking_ids
    )
    candidate_not_blocked = bool(
        candidate_exists and candidate_booking.id not in blocked_booking_ids
    )
    add(
        "requester_not_in_active_exchange",
        "Your booking is free",
        requester_not_blocked,
        "Your booking is not part of another active exchange request."
        if requester_not_blocked
        else "Your booking is already part of an active exchange request.",
    )
    add(
        "candidate_not_in_active_exchange",
        "Candidate booking is free",
        candidate_not_blocked,
        "The candidate booking is not part of another active exchange request."
        if candidate_not_blocked
        else "The candidate booking is already part of an active exchange request.",
    )

    reciprocal_satisfied = requester_wants_candidate and candidate_wants_requester
    scope_satisfied = requester_scope_ok and candidate_scope_ok
    eligible = all(check["passed"] for check in checks)
    failures = [check for check in checks if not check["passed"]]

    return {
        "eligible": eligible,
        "checks": checks,
        "failed_codes": [failure["code"] for failure in failures],
        "reasons": [failure["detail"] for failure in failures],
        "reciprocal_satisfied": reciprocal_satisfied,
        "journey_active": journey_active,
        "scope_satisfied": scope_satisfied,
    }


def _candidate_public_payload(requester_booking, candidate_booking, result):
    return {
        "candidate_booking_id": candidate_booking.id,
        "candidate_display_name": candidate_booking.user.public_identity(),
        "current_berth_type": candidate_booking.berth.berth_type,
        "desired_berth_type": (
            candidate_booking.preference.desired_berth_type
            if candidate_booking.preference
            else None
        ),
        "candidate_coach_number": candidate_booking.coach.coach_number,
        "candidate_berth_number": candidate_booking.berth.berth_number,
        "same_coach": requester_booking.coach.id == candidate_booking.coach.id,
        "journey": {
            "id": candidate_booking.journey.id,
            "journey_date": isoformat(candidate_booking.journey.journey_date),
            "train_number": candidate_booking.journey.train.train_number,
            "train_name": candidate_booking.journey.train.train_name,
            "source": candidate_booking.journey.train.source,
            "destination": candidate_booking.journey.train.destination,
        },
        "compatibility_score": result["score_details"]["score"],
        "rank": result.get("rank"),
        "score_breakdown": result["score_details"],
        "features": result["features"],
        "eligibility": result["eligibility"],
        "explanation": result["explanation"],
        "ml": result["ml"],
        "limitations": APPLICATION_LIMITATIONS,
    }


def _score_pair(
    requester_booking,
    candidate_booking,
    eligibility,
    include_rank=None,
):
    features, score_details = candidate_features(
        requester_booking, candidate_booking, eligibility
    )
    ml_score = ml_service.predict(features)
    ml_status = ml_service.status()
    ml_result = {
        "available": ml_score is not None,
        "score": ml_score,
        "label": "synthetic_compatibility_confidence",
        "note": (
            "Experimental Random Forest confidence on synthetic compatibility "
            "labels. It does not predict real passenger acceptance."
            if ml_score is not None
            else "ML artifact unavailable; deterministic score used."
        ),
    }
    explanation = build_explanation(
        requester_booking,
        candidate_booking,
        eligibility,
        features,
        score_details,
        ml_result,
    )
    result = {
        "score_details": score_details,
        "features": features,
        "eligibility": eligibility,
        "ml": ml_result,
        "ml_status": ml_status,
        "explanation": explanation,
    }
    if include_rank is not None:
        result["rank"] = include_rank
    return result


def find_matches(requester_booking, preference=None, limit=20):
    preference = preference or requester_booking.preference
    if preference is None:
        return {
            "matches": [],
            "meta": {
                "count": 0,
                "excluded_count": 0,
                "reason": "Set a berth preference before searching for matches.",
                "limitations": APPLICATION_LIMITATIONS,
                "ml": ml_service.status(),
                "generated_at": isoformat(utcnow()),
            },
        }

    blocked_ids = active_booking_ids()
    candidates = (
        Booking.query.options(
            joinedload(Booking.berth).joinedload(Berth.coach),
            joinedload(Booking.preference),
            joinedload(Booking.user),
            joinedload(Booking.journey).joinedload(Journey.train),
        )
        .filter(
            Booking.journey_id == requester_booking.journey_id,
            Booking.id != requester_booking.id,
            Booking.user_id != requester_booking.user_id,
        )
        .all()
    )

    results = []
    for candidate in candidates:
        eligibility = evaluate_candidate(
            requester_booking,
            candidate,
            requester_preference=preference,
            candidate_preference=candidate.preference,
            blocked_booking_ids=blocked_ids,
        )
        if not eligibility["eligible"]:
            continue
        result = _score_pair(requester_booking, candidate, eligibility)
        results.append(
            {
                "candidate": candidate,
                "result": result,
            }
        )

    results.sort(
        key=lambda item: (
            -item["result"]["score_details"]["score"],
            item["candidate"].id,
        )
    )
    effective_limit = max(1, min(int(limit or 20), 100))
    top_results = results[:effective_limit]

    matches = []
    for rank, item in enumerate(top_results, start=1):
        item["result"]["rank"] = rank
        matches.append(
            _candidate_public_payload(
                requester_booking, item["candidate"], item["result"]
            )
        )

    ml_status = ml_service.status()
    return {
        "matches": matches,
        "meta": {
            "count": len(matches),
            "candidate_pool": len(candidates),
            "excluded_count": len(candidates) - len(matches),
            "limit": effective_limit,
            "requester_booking_id": requester_booking.id,
            "requester_has_active_exchange": requester_booking.id in blocked_ids,
            "score_method": "deterministic_weighted_baseline",
            "ranking_tie_break": "lower candidate_booking_id",
            "weights": dict(SCORE_WEIGHTS),
            "limitations": APPLICATION_LIMITATIONS,
            "ml": ml_status,
            "generated_at": isoformat(utcnow()),
        },
    }


def build_candidate_explanation(requester_booking, candidate_booking):
    preference = requester_booking.preference
    blocked_ids = active_booking_ids()
    eligibility = evaluate_candidate(
        requester_booking,
        candidate_booking,
        requester_preference=preference,
        candidate_preference=candidate_booking.preference,
        blocked_booking_ids=blocked_ids,
    )
    result = _score_pair(requester_booking, candidate_booking, eligibility)
    payload = _candidate_public_payload(requester_booking, candidate_booking, result)
    payload["meta"] = {
        "requester_booking_id": requester_booking.id,
        "generated_at": isoformat(utcnow()),
        "limitations": APPLICATION_LIMITATIONS,
        "ml": result["ml_status"],
    }
    return payload


def get_requester_preference(booking_id, user_id, legacy=False):
    preference = Preference.query.filter_by(booking_id=booking_id).first()
    if preference and preference.booking.user_id != user_id:
        return None
    return preference
