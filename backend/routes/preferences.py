from flask import Blueprint, jsonify, request
from flask_jwt_extended import current_user, jwt_required

from backend.constants import BERTH_TYPES, COACH_SCOPES
from backend.errors import ApiError
from backend.extensions import db
from backend.models import Booking, Preference
from backend.security import owned_booking_or_404, owned_preference_or_404
from backend.services.matching_service import booking_has_active_exchange
from backend.utils import normalize_berth_type, normalize_coach_scope
from backend.validation import json_body, require_int

preferences_bp = Blueprint("preferences", __name__, url_prefix="/api/preferences")


def _validate_berth_type(value):
    normalized = normalize_berth_type(value)
    if normalized not in BERTH_TYPES:
        raise ApiError(
            "desired_berth_type must be one of: " + ", ".join(BERTH_TYPES),
            400,
            "VALIDATION_ERROR",
        )
    return normalized


def _validate_coach_scope(value):
    normalized = normalize_coach_scope(value)
    if normalized not in COACH_SCOPES:
        raise ApiError(
            "coach_scope must be ANY or SAME_COACH.",
            400,
            "VALIDATION_ERROR",
        )
    return normalized


@preferences_bp.get("")
@jwt_required()
def list_preferences():
    query = Preference.query.join(Booking).filter(
        Booking.user_id == current_user.id
    )
    booking_id = request.args.get("booking_id")
    if booking_id is not None:
        query = query.filter(Preference.booking_id == require_int(booking_id, "booking_id", 1))
    preferences = query.order_by(Preference.updated_at.desc()).all()
    return jsonify(
        {
            "items": [preference.to_dict() for preference in preferences],
            "count": len(preferences),
        }
    )


@preferences_bp.post("")
@jwt_required()
def create_preference():
    payload = json_body()
    booking_id = require_int(payload.get("booking_id"), "booking_id", 1)
    booking = owned_booking_or_404(booking_id, current_user.id)
    if Preference.query.filter_by(booking_id=booking.id).first():
        raise ApiError(
            "This booking already has a preference. Update it instead.",
            409,
            "PREFERENCE_EXISTS",
        )
    desired = _validate_berth_type(payload.get("desired_berth_type"))
    coach_scope = _validate_coach_scope(payload.get("coach_scope", "ANY"))
    preference = Preference(
        booking_id=booking.id,
        desired_berth_type=desired,
        coach_scope=coach_scope,
    )
    db.session.add(preference)
    db.session.commit()
    return jsonify({"preference": preference.to_dict()}), 201


@preferences_bp.put("/<int:preference_id>")
@jwt_required()
def update_preference(preference_id):
    preference = owned_preference_or_404(preference_id, current_user.id)
    if booking_has_active_exchange(preference.booking_id):
        raise ApiError(
            "Preferences cannot be changed while an exchange request is active.",
            409,
            "ACTIVE_EXCHANGE_CONFLICT",
        )
    payload = json_body()
    changed = False
    if "desired_berth_type" in payload:
        preference.desired_berth_type = _validate_berth_type(
            payload.get("desired_berth_type")
        )
        changed = True
    if "coach_scope" in payload:
        preference.coach_scope = _validate_coach_scope(
            payload.get("coach_scope")
        )
        changed = True
    if not changed:
        raise ApiError(
            "No supported preference fields were supplied.",
            400,
            "VALIDATION_ERROR",
        )
    db.session.commit()
    return jsonify({"preference": preference.to_dict()})
