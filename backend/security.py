from functools import wraps

from flask_jwt_extended import current_user, jwt_required

from backend.errors import ApiError
from backend.extensions import db
from backend.models import Booking, ExchangeRequest, Preference


def admin_required(fn):
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        if current_user is None or current_user.role != "admin":
            raise ApiError(
                "Administrator privileges are required.", 403, "FORBIDDEN"
            )
        return fn(*args, **kwargs)

    return wrapper


def owned_booking_or_404(booking_id, user_id):
    booking = db.session.get(Booking, booking_id)
    if booking is None:
        raise ApiError("Booking not found.", 404, "BOOKING_NOT_FOUND")
    if booking.user_id != user_id:
        raise ApiError(
            "You do not have access to this booking.", 403, "FORBIDDEN"
        )
    return booking


def owned_preference_or_404(preference_id, user_id):
    preference = db.session.get(Preference, preference_id)
    if preference is None:
        raise ApiError("Preference not found.", 404, "PREFERENCE_NOT_FOUND")
    if preference.booking.user_id != user_id:
        raise ApiError(
            "You do not have access to this preference.", 403, "FORBIDDEN"
        )
    return preference


def participant_exchange_or_404(exchange_id, user_id):
    exchange = db.session.get(ExchangeRequest, exchange_id)
    if exchange is None:
        raise ApiError(
            "Exchange request not found.", 404, "EXCHANGE_NOT_FOUND"
        )
    participant_ids = {
        exchange.requester_booking.user_id,
        exchange.recipient_booking.user_id,
    }
    if user_id not in participant_ids:
        raise ApiError(
            "You do not have access to this exchange request.",
            403,
            "FORBIDDEN",
        )
    return exchange
