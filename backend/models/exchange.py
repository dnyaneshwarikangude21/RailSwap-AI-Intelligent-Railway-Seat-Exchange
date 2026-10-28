from backend.constants import EXCHANGE_PENDING
from backend.extensions import db
from backend.utils import isoformat, utcnow


class ExchangeRequest(db.Model):
    __tablename__ = "exchange_requests"
    __table_args__ = (
        db.CheckConstraint(
            "requester_booking_id <> recipient_booking_id",
            name="ck_exchange_requests_distinct_bookings",
        ),
        db.CheckConstraint(
            "status IN ('PENDING', 'ACCEPTED_BY_BOTH', 'DECLINED', 'CANCELLED', "
            "'AWAITING_EXTERNAL_AUTHORIZATION', 'COMPLETED', 'EXPIRED')",
            name="ck_exchange_requests_status_valid",
        ),
        db.CheckConstraint(
            "compatibility_score >= 0 AND compatibility_score <= 100",
            name="ck_exchange_requests_score_range",
        ),
        db.Index(
            "ix_exchange_requests_requester_status",
            "requester_booking_id",
            "status",
        ),
        db.Index(
            "ix_exchange_requests_recipient_status",
            "recipient_booking_id",
            "status",
        ),
    )

    id = db.Column(db.Integer, primary_key=True)
    requester_booking_id = db.Column(
        db.Integer,
        db.ForeignKey("bookings.id", ondelete="RESTRICT"),
        nullable=False,
    )
    recipient_booking_id = db.Column(
        db.Integer,
        db.ForeignKey("bookings.id", ondelete="RESTRICT"),
        nullable=False,
    )
    status = db.Column(db.String(40), nullable=False, default=EXCHANGE_PENDING)
    compatibility_score = db.Column(db.Float, nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=utcnow, index=True)
    updated_at = db.Column(
        db.DateTime, nullable=False, default=utcnow, onupdate=utcnow
    )

    requester_booking = db.relationship(
        "Booking",
        foreign_keys=[requester_booking_id],
        back_populates="outgoing_exchanges",
    )
    recipient_booking = db.relationship(
        "Booking",
        foreign_keys=[recipient_booking_id],
        back_populates="incoming_exchanges",
    )
    events = db.relationship(
        "ExchangeEvent",
        back_populates="exchange_request",
        cascade="all, delete-orphan",
        order_by="ExchangeEvent.created_at",
    )

    def to_dict(self):
        return {
            "id": self.id,
            "requester_booking_id": self.requester_booking_id,
            "recipient_booking_id": self.recipient_booking_id,
            "status": self.status,
            "compatibility_score": self.compatibility_score,
            "created_at": isoformat(self.created_at),
            "updated_at": isoformat(self.updated_at),
        }

    def __repr__(self):
        return f"<ExchangeRequest {self.id} {self.status}>"


class ExchangeEvent(db.Model):
    __tablename__ = "exchange_events"

    id = db.Column(db.Integer, primary_key=True)
    exchange_request_id = db.Column(
        db.Integer,
        db.ForeignKey("exchange_requests.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    actor_user_id = db.Column(
        db.Integer, db.ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    event_type = db.Column(db.String(60), nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=utcnow, index=True)

    exchange_request = db.relationship("ExchangeRequest", back_populates="events")
    actor = db.relationship("User")

    def to_dict(self):
        return {
            "id": self.id,
            "exchange_request_id": self.exchange_request_id,
            "actor_user_id": self.actor_user_id,
            "event_type": self.event_type,
            "created_at": isoformat(self.created_at),
        }
