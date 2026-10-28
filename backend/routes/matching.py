from flask import Blueprint, current_app, jsonify, request
from flask_jwt_extended import current_user, jwt_required

from backend.errors import ApiError
from backend.extensions import db
from backend.models import Booking
from backend.security import owned_booking_or_404
from backend.services.matching_service import (
    build_candidate_explanation,
    find_matches,
)
from backend.validation import json_body, require_int

matching_bp = Blueprint("matching", __name__, url_prefix="/api/matching")


@matching_bp.post("/search")
@jwt_required()
def search_matches():
    payload = json_body()
    booking_id = require_int(payload.get("booking_id"), "booking_id", 1)
    booking = owned_booking_or_404(booking_id, current_user.id)
    if booking.preference is None:
        raise ApiError(
            "Set a berth preference for this booking before searching.",
            400,
            "PREFERENCE_REQUIRED",
        )
    limit = payload.get("limit", current_app.config.get("MATCHING_RESULT_LIMIT", 20))
    try:
        limit = max(1, min(int(limit), 100))
    except (TypeError, ValueError):
        raise ApiError("limit must be an integer.", 400, "VALIDATION_ERROR") from None

    result = find_matches(booking, preference=booking.preference, limit=limit)
    return jsonify(
        {
            "items": result["matches"],
            "count": len(result["matches"]),
            "meta": result["meta"],
        }
    )


@matching_bp.get("/<int:candidate_booking_id>/explanation")
@jwt_required()
def candidate_explanation(candidate_booking_id):
    booking_id_raw = request.args.get("booking_id")
    if booking_id_raw is None:
        raise ApiError(
            "booking_id query parameter is required.",
            400,
            "VALIDATION_ERROR",
        )
    booking_id = require_int(booking_id_raw, "booking_id", 1)
    requester_booking = owned_booking_or_404(booking_id, current_user.id)
    if requester_booking.preference is None:
        raise ApiError(
            "Set a berth preference for this booking before viewing explanations.",
            400,
            "PREFERENCE_REQUIRED",
        )
    candidate = db.session.get(Booking, candidate_booking_id)
    if candidate is None:
        raise ApiError("Candidate booking not found.", 404, "CANDIDATE_NOT_FOUND")
    if candidate.user_id == current_user.id:
        raise ApiError(
            "You cannot evaluate a match against your own booking.",
            400,
            "SELF_EXCHANGE_NOT_ALLOWED",
        )
    if candidate.journey_id != requester_booking.journey_id:
        raise ApiError("Candidate booking not found.", 404, "CANDIDATE_NOT_FOUND")

    result = build_candidate_explanation(requester_booking, candidate)
    return jsonify({"match": result})
