from flask import Blueprint, jsonify, request
from flask_jwt_extended import current_user, jwt_required

from backend.constants import (
    ACTIVE_EXCHANGE_STATUSES,
    EXCHANGE_COMPLETED,
    EXCHANGE_PENDING,
)
from backend.extensions import db
from backend.models import Booking, ExchangeRequest, Notification
from backend.services.matching_service import find_matches
from backend.services.ml_service import ml_service
from backend.utils import isoformat, utcnow

analytics_bp = Blueprint("analytics", __name__, url_prefix="/api/analytics")


def _own_booking_ids():
    return [
        booking_id
        for (booking_id,) in db.session.query(Booking.id)
        .filter(Booking.user_id == current_user.id)
        .all()
    ]


@analytics_bp.get("/dashboard")
@jwt_required()
def dashboard():
    bookings = (
        Booking.query.filter_by(user_id=current_user.id)
        .order_by(Booking.created_at.desc())
        .all()
    )
    booking_ids = [booking.id for booking in bookings]
    if booking_ids:
        exchanges = (
            ExchangeRequest.query.filter(
                db.or_(
                    ExchangeRequest.requester_booking_id.in_(booking_ids),
                    ExchangeRequest.recipient_booking_id.in_(booking_ids),
                )
            )
            .order_by(ExchangeRequest.updated_at.desc())
            .all()
        )
    else:
        exchanges = []

    active_exchanges = [
        exchange
        for exchange in exchanges
        if exchange.status in ACTIVE_EXCHANGE_STATUSES
    ]
    pending_responses = [
        exchange
        for exchange in exchanges
        if exchange.recipient_booking.user_id == current_user.id
        and exchange.status == EXCHANGE_PENDING
    ]
    completed = [
        exchange
        for exchange in exchanges
        if exchange.status == EXCHANGE_COMPLETED
    ]

    unread_count = Notification.query.filter_by(
        user_id=current_user.id, read_at=None
    ).count()
    recent_notifications = (
        Notification.query.filter_by(user_id=current_user.id)
        .order_by(Notification.created_at.desc())
        .limit(6)
        .all()
    )

    matched_candidates = {}
    bookings_with_preferences = 0
    engine_mode = "rule_based_fallback"
    matching_limitations = []
    for booking in bookings:
        if booking.preference is None:
            continue
        bookings_with_preferences += 1
        result = find_matches(booking, preference=booking.preference, limit=100)
        engine_mode = result["meta"].get("ml", {}).get("mode", engine_mode)
        if not matching_limitations:
            matching_limitations = result["meta"].get("limitations", [])
        for match in result["matches"]:
            existing = matched_candidates.get(match["candidate_booking_id"])
            if existing is None or match["compatibility_score"] > existing:
                matched_candidates[match["candidate_booking_id"]] = match[
                    "compatibility_score"
                ]

    average_score = (
        round(sum(matched_candidates.values()) / len(matched_candidates), 2)
        if matched_candidates
        else None
    )

    journey_items = []
    for booking in sorted(bookings, key=lambda item: item.journey.journey_date):
        journey_items.append(
            {
                "booking_id": booking.id,
                "journey_id": booking.journey_id,
                "journey_date": isoformat(booking.journey.journey_date),
                "departure_time": booking.journey.departure_time,
                "arrival_time": booking.journey.arrival_time,
                "train_number": booking.journey.train.train_number,
                "train_name": booking.journey.train.train_name,
                "source": booking.journey.train.source,
                "destination": booking.journey.train.destination,
                "coach_number": booking.coach.coach_number,
                "berth_number": booking.berth.berth_number,
                "berth_type": booking.berth.berth_type,
                "desired_berth_type": (
                    booking.preference.desired_berth_type
                    if booking.preference
                    else None
                ),
                "has_active_exchange": any(
                    exchange
                    for exchange in active_exchanges
                    if booking.id
                    in (
                        exchange.requester_booking_id,
                        exchange.recipient_booking_id,
                    )
                ),
            }
        )

    recent_exchanges = []
    for exchange in exchanges[:5]:
        is_requester = exchange.requester_booking.user_id == current_user.id
        other_booking = (
            exchange.recipient_booking
            if is_requester
            else exchange.requester_booking
        )
        recent_exchanges.append(
            {
                "id": exchange.id,
                "status": exchange.status,
                "compatibility_score": exchange.compatibility_score,
                "direction": "OUTGOING" if is_requester else "INCOMING",
                "other_display_name": other_booking.user.public_identity(),
                "updated_at": isoformat(exchange.updated_at),
                "journey_date": isoformat(other_booking.journey.journey_date),
                "train_number": other_booking.journey.train.train_number,
            }
        )

    recent_activity = [
        {
            "id": notification.id,
            "type": "NOTIFICATION",
            "title": notification.title,
            "message": notification.message,
            "read": notification.read_at is not None,
            "created_at": isoformat(notification.created_at),
        }
        for notification in recent_notifications
    ]

    return jsonify(
        {
            "stats": {
                "total_bookings": len(bookings),
                "active_exchanges": len(active_exchanges),
                "compatible_matches": len(matched_candidates),
                "pending_responses": len(pending_responses),
                "completed_exchanges": len(completed),
                "unread_notifications": unread_count,
            },
            "matching_stats": {
                "bookings_with_preferences": bookings_with_preferences,
                "eligible_candidates": len(matched_candidates),
                "average_compatibility_score": average_score,
                "engine_mode": engine_mode,
                "limitations": matching_limitations,
            },
            "journeys": journey_items,
            "recent_exchanges": recent_exchanges,
            "recent_activity": recent_activity,
            "data_mode": "SYNTHETIC_DEMONSTRATION_DATA",
            "generated_at": isoformat(utcnow()),
        }
    )


@analytics_bp.get("/ml-metrics")
@jwt_required()
def ml_metrics():
    metrics = ml_service.metrics()
    return jsonify(
        {
            "metrics": metrics,
            "model": ml_service.status(),
            "notice": (
                "Metrics are produced from a synthetic dataset whose labels are "
                "derived from documented rules. High scores validate implementation "
                "consistency, not real-world acceptance prediction."
            ),
        }
    )
