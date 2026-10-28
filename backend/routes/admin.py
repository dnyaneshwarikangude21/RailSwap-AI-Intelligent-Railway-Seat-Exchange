from flask import Blueprint, jsonify, request
from sqlalchemy import func

from backend.constants import (
    ACTIVE_EXCHANGE_STATUSES,
    EXCHANGE_STATUSES,
)
from backend.errors import ApiError
from backend.extensions import db
from backend.models import (
    Booking,
    ExchangeRequest,
    Journey,
    Notification,
    Train,
    User,
)
from backend.security import admin_required
from backend.services.exchange_service import admin_advance_exchange
from backend.services.ml_service import ml_service
from backend.utils import isoformat, utcnow
from backend.validation import json_body

admin_bp = Blueprint("admin", __name__, url_prefix="/api/admin")


def _admin_exchange_summary(exchange):
    journey = exchange.requester_booking.journey
    return {
        "id": exchange.id,
        "status": exchange.status,
        "compatibility_score": exchange.compatibility_score,
        "created_at": isoformat(exchange.created_at),
        "updated_at": isoformat(exchange.updated_at),
        "journey_date": isoformat(journey.journey_date),
        "train_number": journey.train.train_number,
        "source": journey.train.source,
        "destination": journey.train.destination,
        "passenger_data": "REDACTED",
        "official_change": False,
    }


@admin_bp.get("/overview")
@admin_required
def overview():
    status_counts = {
        status: 0
        for status in EXCHANGE_STATUSES
    }
    for status, count in (
        db.session.query(ExchangeRequest.status, func.count(ExchangeRequest.id))
        .group_by(ExchangeRequest.status)
        .all()
    ):
        status_counts[status] = count
    active_count = sum(
        status_counts.get(status, 0) for status in ACTIVE_EXCHANGE_STATUSES
    )
    return jsonify(
        {
            "counts": {
                "users": User.query.count(),
                "admins": User.query.filter_by(role="admin").count(),
                "trains": Train.query.count(),
                "journeys": Journey.query.count(),
                "bookings": Booking.query.count(),
                "exchange_requests": ExchangeRequest.query.count(),
                "notifications": Notification.query.count(),
                "active_exchanges": active_count,
            },
            "exchange_status_counts": status_counts,
            "ml": ml_service.status(),
            "data_mode": "SYNTHETIC_DEMONSTRATION_DATA",
            "privacy_note": (
                "Administrators see aggregate and exchange-state information only. "
                "Passenger names, emails, references, and ticket details are redacted."
            ),
            "generated_at": isoformat(utcnow()),
        }
    )


@admin_bp.get("/exchanges")
@admin_required
def exchanges():
    status = (request.args.get("status") or "").strip().upper()
    if status and status not in EXCHANGE_STATUSES:
        raise ApiError("Unknown exchange status filter.", 400, "VALIDATION_ERROR")
    try:
        limit = max(1, min(int(request.args.get("limit", 50)), 100))
    except ValueError:
        raise ApiError("limit must be an integer.", 400, "VALIDATION_ERROR") from None
    query = ExchangeRequest.query
    if status:
        query = query.filter(ExchangeRequest.status == status)
    results = query.order_by(ExchangeRequest.updated_at.desc()).limit(limit).all()
    return jsonify(
        {
            "items": [_admin_exchange_summary(exchange) for exchange in results],
            "count": len(results),
            "redaction": "Passenger identity and booking references are not exposed.",
        }
    )


@admin_bp.post("/exchanges/<int:exchange_id>/advance")
@admin_required
def advance_exchange(exchange_id):
    from flask_jwt_extended import current_user

    exchange = db.session.get(ExchangeRequest, exchange_id)
    if exchange is None:
        raise ApiError("Exchange request not found.", 404, "EXCHANGE_NOT_FOUND")
    payload = json_body()
    target_status = str(payload.get("target_status") or "").strip().upper()
    updated = admin_advance_exchange(exchange, current_user, target_status)
    return jsonify(
        {
            "exchange": _admin_exchange_summary(updated),
            "simulation_note": (
                "This administrative action only simulates an external authorization "
                "gate. It does not modify or contact any railway reservation system."
            ),
        }
    )
