from sqlalchemy.exc import IntegrityError

from backend.constants import (
    ACTIVE_EXCHANGE_STATUSES,
    EVENT_ACCEPTED,
    EVENT_AUTHORIZATION_STARTED,
    EVENT_CANCELLED,
    EVENT_COMPLETED,
    EVENT_CREATED,
    EVENT_DECLINED,
    EVENT_EXPIRED,
    EXCHANGE_ACCEPTED_BY_BOTH,
    EXCHANGE_AWAITING_AUTH,
    EXCHANGE_CANCELLED,
    EXCHANGE_COMPLETED,
    EXCHANGE_DECLINED,
    EXCHANGE_EXPIRED,
    EXCHANGE_PENDING,
)
from backend.errors import ApiError
from backend.extensions import db
from backend.models import ExchangeEvent, ExchangeRequest
from backend.services.matching_service import (
    active_booking_ids,
    booking_has_active_exchange,
    evaluate_candidate,
)
from backend.services.notification_service import notify, notify_exchange_event
from backend.services.scoring_service import candidate_features
from backend.utils import isoformat, utcnow

EVENT_LABELS = {
    EVENT_CREATED: "Request created",
    EVENT_ACCEPTED: "Recipient accepted",
    EVENT_DECLINED: "Recipient declined",
    EVENT_CANCELLED: "Request cancelled",
    EVENT_AUTHORIZATION_STARTED: "Simulated authorization started",
    EVENT_COMPLETED: "Simulated authorization completed",
    EVENT_EXPIRED: "Request expired",
}


def _booking_summary(booking):
    return {
        "booking_id": booking.id,
        "display_name": booking.user.public_identity(),
        "coach_number": booking.coach.coach_number if booking.coach else None,
        "berth_number": booking.berth.berth_number if booking.berth else None,
        "berth_type": booking.berth.berth_type if booking.berth else None,
        "desired_berth_type": (
            booking.preference.desired_berth_type if booking.preference else None
        ),
        "coach_scope": booking.preference.coach_scope if booking.preference else None,
    }


def serialize_exchange(exchange, viewer_id):
    requester = exchange.requester_booking
    recipient = exchange.recipient_booking
    is_requester = requester.user_id == viewer_id
    is_recipient = recipient.user_id == viewer_id
    if not (is_requester or is_recipient):
        return None

    journey = requester.journey
    events = [
        {
            "event_type": event.event_type,
            "label": EVENT_LABELS.get(event.event_type, event.event_type),
            "created_at": isoformat(event.created_at),
            "actor": (
                "you"
                if event.actor_user_id == viewer_id
                else "other passenger"
                if event.actor_user_id in (requester.user_id, recipient.user_id)
                else "system"
            ),
        }
        for event in exchange.events
    ]

    return {
        "id": exchange.id,
        "status": exchange.status,
        "compatibility_score": exchange.compatibility_score,
        "direction": "OUTGOING" if is_requester else "INCOMING",
        "created_at": isoformat(exchange.created_at),
        "updated_at": isoformat(exchange.updated_at),
        "requester": _booking_summary(requester),
        "recipient": _booking_summary(recipient),
        "journey": {
            "id": journey.id,
            "journey_date": isoformat(journey.journey_date),
            "departure_time": journey.departure_time,
            "arrival_time": journey.arrival_time,
            "train_number": journey.train.train_number,
            "train_name": journey.train.train_name,
            "source": journey.train.source,
            "destination": journey.train.destination,
        },
        "can_accept": is_recipient and exchange.status == EXCHANGE_PENDING,
        "can_decline": is_recipient and exchange.status == EXCHANGE_PENDING,
        "can_cancel": exchange.status in ACTIVE_EXCHANGE_STATUSES,
        "events": events,
        "official_change": False,
        "notice": (
            "Application-level consent only. No official railway reservation is "
            "modified by this prototype."
        ),
        "data_mode": "SYNTHETIC_DEMONSTRATION_DATA",
    }


def create_exchange(actor, requester_booking, recipient_booking):
    if requester_booking.user_id != actor.id:
        raise ApiError(
            "You can only create a request from your own booking.",
            403,
            "FORBIDDEN",
        )
    if recipient_booking.user_id == actor.id:
        raise ApiError(
            "You cannot request an exchange with your own booking.",
            400,
            "SELF_EXCHANGE_NOT_ALLOWED",
        )
    if requester_booking.preference is None:
        raise ApiError(
            "Set your berth preference before creating an exchange request.",
            400,
            "PREFERENCE_REQUIRED",
        )
    if recipient_booking.preference is None:
        raise ApiError(
            "The candidate has not configured a berth preference.",
            422,
            "CANDIDATE_NOT_ELIGIBLE",
        )

    existing = ExchangeRequest.query.filter(
        ExchangeRequest.status.in_(ACTIVE_EXCHANGE_STATUSES),
        db.or_(
            ExchangeRequest.requester_booking_id.in_(
                [requester_booking.id, recipient_booking.id]
            ),
            ExchangeRequest.recipient_booking_id.in_(
                [requester_booking.id, recipient_booking.id]
            ),
        ),
    ).first()
    if existing:
        raise ApiError(
            "One of these bookings is already part of an active exchange request.",
            409,
            "ACTIVE_EXCHANGE_CONFLICT",
        )

    blocked_ids = active_booking_ids()
    eligibility = evaluate_candidate(
        requester_booking,
        recipient_booking,
        requester_preference=requester_booking.preference,
        candidate_preference=recipient_booking.preference,
        blocked_booking_ids=blocked_ids,
    )
    if not eligibility["eligible"]:
        raise ApiError(
            "The selected booking is not eligible for this exchange.",
            422,
            "CANDIDATE_NOT_ELIGIBLE",
            eligibility["reasons"],
        )

    _features, score_details = candidate_features(
        requester_booking, recipient_booking, eligibility
    )
    exchange = ExchangeRequest(
        requester_booking_id=requester_booking.id,
        recipient_booking_id=recipient_booking.id,
        status=EXCHANGE_PENDING,
        compatibility_score=score_details["score"],
    )
    db.session.add(exchange)
    try:
        db.session.flush()
        db.session.add(
            ExchangeEvent(
                exchange_request_id=exchange.id,
                actor_user_id=actor.id,
                event_type=EVENT_CREATED,
            )
        )
        notify_exchange_event(exchange, "CREATED", recipient_booking.user_id)
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        raise ApiError(
            "The exchange request conflicted with an existing request.",
            409,
            "ACTIVE_EXCHANGE_CONFLICT",
        ) from None
    return exchange


def _recipient_check(exchange, actor):
    if exchange.recipient_booking.user_id != actor.id:
        raise ApiError(
            "Only the intended recipient can respond to this request.",
            403,
            "FORBIDDEN",
        )


def _participant_check(exchange, actor):
    if actor.id not in (
        exchange.requester_booking.user_id,
        exchange.recipient_booking.user_id,
    ):
        raise ApiError(
            "You are not a participant in this exchange request.",
            403,
            "FORBIDDEN",
        )


def accept_exchange(exchange, actor):
    _recipient_check(exchange, actor)
    updated = (
        ExchangeRequest.query.filter_by(id=exchange.id, status=EXCHANGE_PENDING)
        .update(
            {
                ExchangeRequest.status: EXCHANGE_ACCEPTED_BY_BOTH,
                ExchangeRequest.updated_at: utcnow(),
            },
            synchronize_session=False,
        )
    )
    if updated != 1:
        db.session.rollback()
        raise ApiError(
            "This request can no longer be accepted in its current state.",
            409,
            "INVALID_STATE_TRANSITION",
            {"status": exchange.status},
        )
    db.session.add(
        ExchangeEvent(
            exchange_request_id=exchange.id,
            actor_user_id=actor.id,
            event_type=EVENT_ACCEPTED,
        )
    )
    notify_exchange_event(
        exchange, "ACCEPTED", exchange.requester_booking.user_id
    )
    db.session.commit()
    db.session.refresh(exchange)
    return exchange


def decline_exchange(exchange, actor):
    _recipient_check(exchange, actor)
    updated = (
        ExchangeRequest.query.filter_by(id=exchange.id, status=EXCHANGE_PENDING)
        .update(
            {
                ExchangeRequest.status: EXCHANGE_DECLINED,
                ExchangeRequest.updated_at: utcnow(),
            },
            synchronize_session=False,
        )
    )
    if updated != 1:
        db.session.rollback()
        raise ApiError(
            "This request can no longer be declined in its current state.",
            409,
            "INVALID_STATE_TRANSITION",
            {"status": exchange.status},
        )
    db.session.add(
        ExchangeEvent(
            exchange_request_id=exchange.id,
            actor_user_id=actor.id,
            event_type=EVENT_DECLINED,
        )
    )
    notify_exchange_event(
        exchange, "DECLINED", exchange.requester_booking.user_id
    )
    db.session.commit()
    db.session.refresh(exchange)
    return exchange


def cancel_exchange(exchange, actor):
    _participant_check(exchange, actor)
    if exchange.status not in ACTIVE_EXCHANGE_STATUSES:
        raise ApiError(
            "Only an active request can be cancelled.",
            409,
            "INVALID_STATE_TRANSITION",
            {"status": exchange.status},
        )
    allowed = (EXCHANGE_PENDING, EXCHANGE_ACCEPTED_BY_BOTH, EXCHANGE_AWAITING_AUTH)
    updated = (
        ExchangeRequest.query.filter(
            ExchangeRequest.id == exchange.id,
            ExchangeRequest.status.in_(allowed),
        ).update(
            {
                ExchangeRequest.status: EXCHANGE_CANCELLED,
                ExchangeRequest.updated_at: utcnow(),
            },
            synchronize_session=False,
        )
    )
    if updated != 1:
        db.session.rollback()
        raise ApiError(
            "The request changed before it could be cancelled. Refresh and try again.",
            409,
            "INVALID_STATE_TRANSITION",
        )
    other_user_id = (
        exchange.recipient_booking.user_id
        if actor.id == exchange.requester_booking.user_id
        else exchange.requester_booking.user_id
    )
    db.session.add(
        ExchangeEvent(
            exchange_request_id=exchange.id,
            actor_user_id=actor.id,
            event_type=EVENT_CANCELLED,
        )
    )
    notify_exchange_event(exchange, "CANCELLED", other_user_id)
    db.session.commit()
    db.session.refresh(exchange)
    return exchange


def admin_advance_exchange(exchange, admin_user, target_status):
    transitions = {
        EXCHANGE_PENDING: {EXCHANGE_EXPIRED},
        EXCHANGE_ACCEPTED_BY_BOTH: {
            EXCHANGE_AWAITING_AUTH,
            EXCHANGE_EXPIRED,
        },
        EXCHANGE_AWAITING_AUTH: {EXCHANGE_COMPLETED},
    }
    if target_status not in transitions.get(exchange.status, set()):
        raise ApiError(
            "That administrative transition is not permitted.",
            409,
            "INVALID_STATE_TRANSITION",
            {"status": exchange.status, "target": target_status},
        )

    updated = (
        ExchangeRequest.query.filter_by(id=exchange.id, status=exchange.status)
        .update(
            {
                ExchangeRequest.status: target_status,
                ExchangeRequest.updated_at: utcnow(),
            },
            synchronize_session=False,
        )
    )
    if updated != 1:
        db.session.rollback()
        raise ApiError(
            "The request changed before the action could be completed.",
            409,
            "CONCURRENT_UPDATE",
        )

    event_type = {
        EXCHANGE_AWAITING_AUTH: EVENT_AUTHORIZATION_STARTED,
        EXCHANGE_COMPLETED: EVENT_COMPLETED,
        EXCHANGE_EXPIRED: EVENT_EXPIRED,
    }[target_status]
    db.session.add(
        ExchangeEvent(
            exchange_request_id=exchange.id,
            actor_user_id=admin_user.id,
            event_type=event_type,
        )
    )
    for user_id in (
        exchange.requester_booking.user_id,
        exchange.recipient_booking.user_id,
    ):
        notify_exchange_event(
            exchange,
            {
                EXCHANGE_AWAITING_AUTH: "AWAITING_AUTH",
                EXCHANGE_COMPLETED: "COMPLETED",
                EXCHANGE_EXPIRED: "EXPIRED",
            }[target_status],
            user_id,
        )
    db.session.commit()
    db.session.refresh(exchange)
    return exchange


def mark_booking_conflict_safe(booking_id):
    return not booking_has_active_exchange(booking_id)
