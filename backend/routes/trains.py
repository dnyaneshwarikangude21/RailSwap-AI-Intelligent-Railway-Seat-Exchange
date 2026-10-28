from datetime import date

from flask import Blueprint, jsonify, request
from flask_jwt_extended import current_user, jwt_required

from backend.errors import ApiError
from backend.extensions import db
from backend.models import Berth, Booking, Journey, Train
from backend.utils import isoformat, parse_iso_date, utcnow
from backend.validation import require_int

trains_bp = Blueprint("trains", __name__, url_prefix="/api")


@trains_bp.get("/trains")
@jwt_required()
def list_trains():
    query = Train.query
    search = (request.args.get("q") or "").strip()
    source = (request.args.get("source") or "").strip()
    destination = (request.args.get("destination") or "").strip()
    if search:
        like = f"%{search}%"
        query = query.filter(
            db.or_(
                Train.train_name.ilike(like),
                Train.train_number.ilike(like),
                Train.source.ilike(like),
                Train.destination.ilike(like),
            )
        )
    if source:
        query = query.filter(Train.source.ilike(source))
    if destination:
        query = query.filter(Train.destination.ilike(destination))

    trains = query.order_by(Train.train_number).all()
    items = []
    today = date.today()
    for train in trains:
        upcoming = (
            train.journeys.filter(Journey.journey_date >= today)
            .order_by(Journey.journey_date)
            .all()
        )
        payload = train.to_dict()
        payload["journey_count"] = len(upcoming)
        payload["next_journey"] = (
            upcoming[0].to_dict() if upcoming else None
        )
        items.append(payload)
    return jsonify({"items": items, "count": len(items)})


@trains_bp.get("/trains/<int:train_id>")
@jwt_required()
def train_detail(train_id):
    train = db.session.get(Train, train_id)
    if train is None:
        raise ApiError("Train not found.", 404, "TRAIN_NOT_FOUND")
    today = date.today()
    journeys = (
        Journey.query.filter_by(train_id=train.id)
        .filter(Journey.journey_date >= today)
        .order_by(Journey.journey_date, Journey.departure_time)
        .all()
    )
    return jsonify(
        {
            "train": train.to_dict(),
            "journeys": [
                journey.to_dict(include_coaches=True) for journey in journeys
            ],
        }
    )


@trains_bp.get("/journeys")
@jwt_required()
def list_journeys():
    query = Journey.query
    train_id = request.args.get("train_id")
    source = (request.args.get("source") or "").strip()
    destination = (request.args.get("destination") or "").strip()
    date_value = request.args.get("date")

    if train_id is not None:
        query = query.filter(Journey.train_id == require_int(train_id, "train_id", 1))
    if date_value:
        parsed = parse_iso_date(date_value)
        if parsed is None:
            raise ApiError(
                "date must use YYYY-MM-DD format.", 400, "VALIDATION_ERROR"
            )
        query = query.filter(Journey.journey_date == parsed)
    elif request.args.get("include_past") != "true":
        query = query.filter(Journey.journey_date >= date.today())

    query = query.join(Train)
    if source:
        query = query.filter(Train.source.ilike(source))
    if destination:
        query = query.filter(Train.destination.ilike(destination))

    journeys = query.order_by(
        Journey.journey_date, Journey.departure_time
    ).all()
    return jsonify(
        {
            "items": [journey.to_dict() for journey in journeys],
            "count": len(journeys),
        }
    )


@trains_bp.get("/journeys/<int:journey_id>")
@jwt_required()
def journey_detail(journey_id):
    journey = db.session.get(Journey, journey_id)
    if journey is None:
        raise ApiError("Journey not found.", 404, "JOURNEY_NOT_FOUND")

    bookings = Booking.query.filter_by(journey_id=journey.id).all()
    booking_by_berth = {booking.berth_id: booking for booking in bookings}

    payload = journey.to_dict(include_coaches=True)
    for coach_payload, coach in zip(payload["coaches"], journey.coaches):
        for berth_payload, berth in zip(coach_payload["berths"], coach.berths):
            booking = booking_by_berth.get(berth.id)
            berth_payload.update(
                {
                    "available": booking is None,
                    "is_your_booking": bool(
                        booking and booking.user_id == current_user.id
                    ),
                    "booking_id": (
                        booking.id
                        if booking and booking.user_id == current_user.id
                        else None
                    ),
                }
            )
    return jsonify({"journey": payload, "generated_at": isoformat(utcnow())})


@trains_bp.get("/berths/<int:berth_id>")
@jwt_required()
def berth_detail(berth_id):
    berth = db.session.get(Berth, berth_id)
    if berth is None:
        raise ApiError("Berth not found.", 404, "BERTH_NOT_FOUND")
    payload = berth.to_dict()
    payload["coach"] = berth.coach.to_dict() if berth.coach else None
    return jsonify({"berth": payload})
