from backend.extensions import db
from backend.utils import isoformat, utcnow


class Preference(db.Model):
    __tablename__ = "preferences"
    __table_args__ = (
        db.CheckConstraint(
            "desired_berth_type IN "
            "('LOWER', 'MIDDLE', 'UPPER', 'SIDE_LOWER', 'SIDE_UPPER')",
            name="ck_preferences_desired_type_valid",
        ),
        db.CheckConstraint(
            "coach_scope IN ('ANY', 'SAME_COACH')",
            name="ck_preferences_coach_scope_valid",
        ),
    )

    id = db.Column(db.Integer, primary_key=True)
    booking_id = db.Column(
        db.Integer,
        db.ForeignKey("bookings.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    desired_berth_type = db.Column(db.String(20), nullable=False)
    coach_scope = db.Column(db.String(20), nullable=False, default="ANY")
    created_at = db.Column(db.DateTime, nullable=False, default=utcnow)
    updated_at = db.Column(
        db.DateTime, nullable=False, default=utcnow, onupdate=utcnow
    )

    booking = db.relationship("Booking", back_populates="preference")

    def to_dict(self):
        return {
            "id": self.id,
            "booking_id": self.booking_id,
            "desired_berth_type": self.desired_berth_type,
            "coach_scope": self.coach_scope,
            "created_at": isoformat(self.created_at),
            "updated_at": isoformat(self.updated_at),
        }

    def __repr__(self):
        return f"<Preference booking={self.booking_id}>"
