from datetime import date

from flask import Blueprint, jsonify
from flask_jwt_extended import current_user, jwt_required
from sqlalchemy.exc import IntegrityError

from backend.errors import ApiError
from backend.extensions import db
from backend.models import Berth, Booking, ExchangeRequest, Journey
from backend.security import owned_booking_or_404
from backend.services.matching_service import booking_has_active_exchange
from backend.utils import generate_demo_reference
from backend.validation import json_body, require_int

bookings_bp = Blueprint("bookings", __name__, url_prefix="/api/bookings")


@bookings_bp.get("")
@jwt_required()
def list_bookings():
    bookings = (
        Booking.query.filter_by(user_id=current_user.id)
        .order_by(Booking.created_at.desc())
        .all()
    )
    items = []
    for booking in bookings:
        payload = booking.to_dict()
        payload["has_active_exchange"] = booking_has_active_exchange(booking.id)
        items.append(payload)
    return jsonify({"items": items, "count": len(items)})


@bookings_bp.post("")
@jwt_required()
def create_booking():
    payload = json_body()
    journey_id = require_int(payload.get("journey_id"), "journey_id", 1)
    berth_id = require_int(payload.get("berth_id"), "berth_id", 1)

    journey = db.session.get(Journey, journey_id)
    if journey is None:
        raise ApiError("Journey not found.", 404, "JOURNEY_NOT_FOUND")
    if journey.journey_date < date.today():
        raise ApiError(
            "Demo bookings cannot be added to a journey in the past.",
            400,
            "JOURNEY_EXPIRED",
        )
    berth = db.session.get(Berth, berth_id)
    if berth is None or berth.coach is None:
        raise ApiError("Berth not found.", 404, "BERTH_NOT_FOUND")
    if berth.coach.journey_id != journey.id:
        raise ApiError(
            "The selected berth does not belong to that journey.",
            400,
            "BERTH_JOURNEY_MISMATCH",
        )
    if Booking.query.filter_by(journey_id=journey.id, berth_id=berth.id).first():
        raise ApiError(
            "That demo berth is already occupied in this journey.",
            409,
            "BERTH_OCCUPIED",
        )

    reference = generate_demo_reference()
    while Booking.query.filter_by(demo_booking_reference=reference).first():
        reference = generate_demo_reference()

    booking = Booking(
        user_id=current_user.id,
        journey_id=journey.id,
        berth_id=berth.id,
        demo_booking_reference=reference,
        verification_status="SIMULATED_VERIFIED",
    )
    db.session.add(booking)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        raise ApiError(
            "That demo berth was booked by another request. Choose another berth.",
            409,
            "BERTH_OCCUPIED",
        ) from None
    return jsonify({"booking": booking.to_dict()}), 201


@bookings_bp.get("/<int:booking_id>")
@jwt_required()
def booking_detail(booking_id):
    booking = owned_booking_or_404(booking_id, current_user.id)
    payload = booking.to_dict()
    payload["has_active_exchange"] = booking_has_active_exchange(booking.id)
    return jsonify({"booking": payload})


@bookings_bp.put("/<int:booking_id>")
@jwt_required()
def update_booking(booking_id):
    booking = owned_booking_or_404(booking_id, current_user.id)
    payload = json_body()
    if "berth_id" not in payload:
        raise ApiError(
            "Only the berth can be changed. Use the preferences API for berth preferences.",
            400,
            "VALIDATION_ERROR",
        )
    if booking_has_active_exchange(booking.id):
        raise ApiError(
            "Cancel or resolve the active exchange request before changing this booking.",
            409,
            "ACTIVE_EXCHANGE_CONFLICT",
        )

    berth_id = require_int(payload.get("berth_id"), "berth_id", 1)
    berth = db.session.get(Berth, berth_id)
    if berth is None or berth.coach is None:
        raise ApiError("Berth not found.", 404, "BERTH_NOT_FOUND")
    if berth.coach.journey_id != booking.journey_id:
        raise ApiError(
            "The selected berth does not belong to this booking's journey.",
            400,
            "BERTH_JOURNEY_MISMATCH",
        )
    if (
        Booking.query.filter(
            Booking.id != booking.id,
            Booking.journey_id == booking.journey_id,
            Booking.berth_id == berth.id,
        ).first()
    ):
        raise ApiError(
            "That demo berth is already occupied.", 409, "BERTH_OCCUPIED"
        )
    booking.berth_id = berth.id
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        raise ApiError(
            "That demo berth was booked by another request.", 409, "BERTH_OCCUPIED"
        ) from None
    return jsonify({"booking": booking.to_dict()})


@bookings_bp.delete("/<int:booking_id>")
@jwt_required()
def delete_booking(booking_id):
    booking = owned_booking_or_404(booking_id, current_user.id)
    has_exchange = (
        ExchangeRequest.query.filter(
            db.or_(
                ExchangeRequest.requester_booking_id == booking.id,
                ExchangeRequest.recipient_booking_id == booking.id,
            )
        ).first()
        is not None
    )
    if has_exchange:
        raise ApiError(
            "This booking has exchange history and cannot be deleted.",
            409,
            "BOOKING_HAS_EXCHANGE_HISTORY",
        )
    db.session.delete(booking)
    db.session.commit()
    return "", 204
