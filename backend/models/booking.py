from backend.constants import VERIFICATION_STATUSES
from backend.extensions import db
from backend.utils import isoformat, utcnow


class Booking(db.Model):
    __tablename__ = "bookings"
    __table_args__ = (
        db.UniqueConstraint(
            "journey_id", "berth_id", name="uq_bookings_journey_berth"
        ),
        db.CheckConstraint(
            "verification_status IN ('SIMULATED_VERIFIED', 'UNVERIFIED')",
            name="ck_bookings_verification_status",
        ),
    )

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    journey_id = db.Column(
        db.Integer, db.ForeignKey("journeys.id", ondelete="CASCADE"), nullable=False
    )
    berth_id = db.Column(
        db.Integer, db.ForeignKey("berths.id", ondelete="RESTRICT"), nullable=False
    )
    demo_booking_reference = db.Column(
        db.String(32), nullable=False, unique=True, index=True
    )
    verification_status = db.Column(
        db.String(32), nullable=False, default="SIMULATED_VERIFIED"
    )
    created_at = db.Column(db.DateTime, nullable=False, default=utcnow)

    user = db.relationship("User", back_populates="bookings")
    journey = db.relationship("Journey", back_populates="bookings")
    berth = db.relationship("Berth", backref=db.backref("bookings", lazy="dynamic"))
    preference = db.relationship(
        "Preference", back_populates="booking", uselist=False, cascade="all, delete-orphan"
    )
    outgoing_exchanges = db.relationship(
        "ExchangeRequest",
        foreign_keys="ExchangeRequest.requester_booking_id",
        back_populates="requester_booking",
        lazy="dynamic",
    )
    incoming_exchanges = db.relationship(
        "ExchangeRequest",
        foreign_keys="ExchangeRequest.recipient_booking_id",
        back_populates="recipient_booking",
        lazy="dynamic",
    )

    @property
    def coach(self):
        return self.berth.coach if self.berth else None

    def to_dict(self):
        coach = self.coach
        return {
            "id": self.id,
            "user_id": self.user_id,
            "journey_id": self.journey_id,
            "berth_id": self.berth_id,
            "demo_booking_reference": self.demo_booking_reference,
            "verification_status": self.verification_status,
            "verification_note": "Simulated verification for demonstration data only.",
            "created_at": isoformat(self.created_at),
            "journey": self.journey.to_dict() if self.journey else None,
            "coach": coach.to_dict() if coach else None,
            "berth": self.berth.to_dict() if self.berth else None,
            "preference": self.preference.to_dict() if self.preference else None,
            "data_mode": "SYNTHETIC_DEMONSTRATION_DATA",
        }

    def __repr__(self):
        return f"<Booking {self.id} {self.demo_booking_reference}>"
