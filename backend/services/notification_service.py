from backend.extensions import db
from backend.models import Notification


def notify(user_id, title, message):
    notification = Notification(
        user_id=user_id,
        title=title[:120],
        message=message[:500],
    )
    db.session.add(notification)
    return notification


def notify_exchange_event(exchange, event_type, recipient_user_id):
    titles = {
        "CREATED": "New exchange request",
        "ACCEPTED": "Exchange request accepted",
        "DECLINED": "Exchange request declined",
        "CANCELLED": "Exchange request cancelled",
        "AWAITING_AUTH": "Simulated authorization pending",
        "COMPLETED": "Simulated authorization completed",
        "EXPIRED": "Exchange request expired",
    }
    messages = {
        "CREATED": (
            "A co-passenger sent a consent-based berth exchange request. "
            "Open Exchange Requests to review it."
        ),
        "ACCEPTED": (
            "The recipient accepted the application-level exchange request. "
            "This is not an official railway authorization."
        ),
        "DECLINED": "The exchange request was declined. No berth was changed.",
        "CANCELLED": "An exchange request was cancelled. No berth was changed.",
        "AWAITING_AUTH": (
            "Both application users agreed. The request now awaits an explicitly "
            "simulated external-authorization step."
        ),
        "COMPLETED": (
            "The administrator completed the simulated authorization step for this "
            "demo request. No real reservation was modified."
        ),
        "EXPIRED": "The exchange request expired. No berth was changed.",
    }
    return notify(
        recipient_user_id,
        titles.get(event_type, "Exchange request updated"),
        messages.get(event_type, "An exchange request was updated."),
    )
