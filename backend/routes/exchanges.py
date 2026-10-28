import json

from flask import Blueprint, Response, jsonify, request
from flask_jwt_extended import current_user, jwt_required

from backend.constants import ACTIVE_EXCHANGE_STATUSES, EXCHANGE_STATUSES
from backend.errors import ApiError
from backend.extensions import db
from backend.models import Booking, ExchangeRequest
from backend.security import participant_exchange_or_404
from backend.services.exchange_service import (
    accept_exchange,
    cancel_exchange,
    create_exchange,
    decline_exchange,
    serialize_exchange,
)
from backend.utils import isoformat, utcnow
from backend.validation import json_body, require_int

exchanges_bp = Blueprint("exchanges", __name__, url_prefix="/api/exchanges")


def _own_booking_ids():
    return [
        booking_id
        for (booking_id,) in db.session.query(Booking.id)
        .filter(Booking.user_id == current_user.id)
        .all()
    ]


@exchanges_bp.get("")
@jwt_required()
def list_exchanges():
    status = (request.args.get("status") or "").strip().upper()
    if status and status not in EXCHANGE_STATUSES:
        raise ApiError("Unknown exchange status filter.", 400, "VALIDATION_ERROR")
    direction = (request.args.get("direction") or "").strip().upper()

    booking_ids = _own_booking_ids()
    if not booking_ids:
        return jsonify({"items": [], "count": 0})
    query = ExchangeRequest.query.filter(
        db.or_(
            ExchangeRequest.requester_booking_id.in_(booking_ids),
            ExchangeRequest.recipient_booking_id.in_(booking_ids),
        )
    )
    if status:
        query = query.filter(ExchangeRequest.status == status)
    if direction in ("INCOMING", "OUTGOING"):
        if direction == "INCOMING":
            query = query.filter(ExchangeRequest.recipient_booking_id.in_(booking_ids))
        else:
            query = query.filter(ExchangeRequest.requester_booking_id.in_(booking_ids))
    elif direction:
        raise ApiError(
            "direction must be INCOMING or OUTGOING.", 400, "VALIDATION_ERROR"
        )

    exchanges = query.order_by(ExchangeRequest.updated_at.desc()).all()
    items = [serialize_exchange(exchange, current_user.id) for exchange in exchanges]
    return jsonify({"items": items, "count": len(items)})


@exchanges_bp.get("/export")
@jwt_required()
def export_exchanges():
    booking_ids = _own_booking_ids()
    exchanges = []
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
    rows = []
    for exchange in exchanges:
        booking_ids_set = {
            exchange.requester_booking_id,
            exchange.recipient_booking_id,
        }
        own_ids = booking_ids_set.intersection(booking_ids)
        journey = exchange.requester_booking.journey
        rows.append(
            {
                "exchange_id": exchange.id,
                "status": exchange.status,
                "compatibility_score": exchange.compatibility_score,
                "role": "REQUESTER" if exchange.requester_booking_id in own_ids else "RECIPIENT",
                "journey_date": isoformat(journey.journey_date),
                "train_number": journey.train.train_number,
                "train_name": journey.train.train_name,
                "source": journey.train.source,
                "destination": journey.train.destination,
                "created_at": isoformat(exchange.created_at),
                "updated_at": isoformat(exchange.updated_at),
            }
        )
    payload = {
        "exported_at": isoformat(utcnow()),
        "data_mode": "SYNTHETIC_DEMONSTRATION_DATA",
        "notice": (
            "Non-sensitive application-level exchange summary. This is not an "
            "official railway record."
        ),
        "exchanges": rows,
    }
    response = Response(
        json.dumps(payload, indent=2),
        mimetype="application/json",
        headers={
            "Content-Disposition": 'attachment; filename="railswap-exchange-summary.json"'
        },
    )
    return response


@exchanges_bp.post("")
@jwt_required()
def request_exchange():
    payload = json_body()
    requester_booking_id = require_int(
        payload.get("requester_booking_id"), "requester_booking_id", 1
    )
    recipient_booking_id = require_int(
        payload.get("recipient_booking_id"), "recipient_booking_id", 1
    )
    requester_booking = db.session.get(Booking, requester_booking_id)
    recipient_booking = db.session.get(Booking, recipient_booking_id)
    if requester_booking is None:
        raise ApiError("Your booking was not found.", 404, "BOOKING_NOT_FOUND")
    if recipient_booking is None:
        raise ApiError("Candidate booking not found.", 404, "CANDIDATE_NOT_FOUND")
    exchange = create_exchange(current_user, requester_booking, recipient_booking)
    return jsonify({"exchange": serialize_exchange(exchange, current_user.id)}), 201


@exchanges_bp.get("/<int:exchange_id>")
@jwt_required()
def exchange_detail(exchange_id):
    exchange = participant_exchange_or_404(exchange_id, current_user.id)
    return jsonify({"exchange": serialize_exchange(exchange, current_user.id)})


@exchanges_bp.post("/<int:exchange_id>/accept")
@jwt_required()
def accept(exchange_id):
    exchange = participant_exchange_or_404(exchange_id, current_user.id)
    updated = accept_exchange(exchange, current_user)
    return jsonify({"exchange": serialize_exchange(updated, current_user.id)})


@exchanges_bp.post("/<int:exchange_id>/decline")
@jwt_required()
def decline(exchange_id):
    exchange = participant_exchange_or_404(exchange_id, current_user.id)
    updated = decline_exchange(exchange, current_user)
    return jsonify({"exchange": serialize_exchange(updated, current_user.id)})


@exchanges_bp.post("/<int:exchange_id>/cancel")
@jwt_required()
def cancel(exchange_id):
    exchange = participant_exchange_or_404(exchange_id, current_user.id)
    updated = cancel_exchange(exchange, current_user)
    return jsonify({"exchange": serialize_exchange(updated, current_user.id)})
