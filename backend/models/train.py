from backend.constants import BERTH_TYPES
from backend.extensions import db
from backend.utils import isoformat


class Train(db.Model):
    __tablename__ = "trains"

    id = db.Column(db.Integer, primary_key=True)
    train_number = db.Column(db.String(12), nullable=False, unique=True, index=True)
    train_name = db.Column(db.String(120), nullable=False)
    source = db.Column(db.String(80), nullable=False)
    destination = db.Column(db.String(80), nullable=False)

    journeys = db.relationship(
        "Journey",
        back_populates="train",
        cascade="all, delete-orphan",
        order_by="Journey.journey_date",
        lazy="dynamic",
    )

    def to_dict(self, include_journeys=False):
        payload = {
            "id": self.id,
            "train_number": self.train_number,
            "train_name": self.train_name,
            "source": self.source,
            "destination": self.destination,
            "data_mode": "SYNTHETIC_DEMONSTRATION_DATA",
        }
        if include_journeys:
            payload["journeys"] = [
                journey.to_dict(include_coaches=True) for journey in self.journeys
            ]
        return payload

    def __repr__(self):
        return f"<Train {self.train_number}>"


class Journey(db.Model):
    __tablename__ = "journeys"
    __table_args__ = (
        db.UniqueConstraint(
            "train_id",
            "journey_date",
            "departure_time",
            "arrival_time",
            name="uq_journeys_schedule",
        ),
    )

    id = db.Column(db.Integer, primary_key=True)
    train_id = db.Column(
        db.Integer, db.ForeignKey("trains.id", ondelete="CASCADE"), nullable=False
    )
    journey_date = db.Column(db.Date, nullable=False, index=True)
    departure_time = db.Column(db.String(5), nullable=False)
    arrival_time = db.Column(db.String(5), nullable=False)

    train = db.relationship("Train", back_populates="journeys")
    coaches = db.relationship(
        "Coach",
        back_populates="journey",
        cascade="all, delete-orphan",
        order_by="Coach.coach_number",
        lazy="selectin",
    )
    bookings = db.relationship("Booking", back_populates="journey", lazy="dynamic")

    def to_dict(self, include_coaches=False):
        payload = {
            "id": self.id,
            "train_id": self.train_id,
            "journey_date": isoformat(self.journey_date),
            "departure_time": self.departure_time,
            "arrival_time": self.arrival_time,
            "train": self.train.to_dict() if self.train else None,
            "data_mode": "SYNTHETIC_DEMONSTRATION_DATA",
        }
        if include_coaches:
            payload["coaches"] = [coach.to_dict(include_berths=True) for coach in self.coaches]
        return payload

    def __repr__(self):
        return f"<Journey {self.id} {self.journey_date}>"


class Coach(db.Model):
    __tablename__ = "coaches"
    __table_args__ = (
        db.UniqueConstraint(
            "journey_id", "coach_number", name="uq_coaches_journey_number"
        ),
        db.CheckConstraint("berth_count > 0", name="ck_coaches_berth_count_positive"),
    )

    id = db.Column(db.Integer, primary_key=True)
    journey_id = db.Column(
        db.Integer, db.ForeignKey("journeys.id", ondelete="CASCADE"), nullable=False
    )
    coach_number = db.Column(db.String(12), nullable=False)
    coach_type = db.Column(db.String(20), nullable=False)
    berth_count = db.Column(db.Integer, nullable=False)

    journey = db.relationship("Journey", back_populates="coaches")
    berths = db.relationship(
        "Berth",
        back_populates="coach",
        cascade="all, delete-orphan",
        order_by="Berth.berth_number",
        lazy="selectin",
    )

    def to_dict(self, include_berths=False):
        payload = {
            "id": self.id,
            "journey_id": self.journey_id,
            "coach_number": self.coach_number,
            "coach_type": self.coach_type,
            "berth_count": self.berth_count,
        }
        if include_berths:
            payload["berths"] = [berth.to_dict() for berth in self.berths]
        return payload

    def __repr__(self):
        return f"<Coach {self.coach_number}>"


class Berth(db.Model):
    __tablename__ = "berths"
    __table_args__ = (
        db.UniqueConstraint("coach_id", "berth_number", name="uq_berths_coach_number"),
        db.CheckConstraint(
            "berth_type IN ('LOWER', 'MIDDLE', 'UPPER', 'SIDE_LOWER', 'SIDE_UPPER')",
            name="ck_berths_type_valid",
        ),
    )

    id = db.Column(db.Integer, primary_key=True)
    coach_id = db.Column(
        db.Integer, db.ForeignKey("coaches.id", ondelete="CASCADE"), nullable=False
    )
    berth_number = db.Column(db.Integer, nullable=False)
    berth_type = db.Column(db.String(20), nullable=False)

    coach = db.relationship("Coach", back_populates="berths")

    def to_dict(self):
        return {
            "id": self.id,
            "coach_id": self.coach_id,
            "berth_number": self.berth_number,
            "berth_type": self.berth_type,
        }

    def __repr__(self):
        return f"<Berth {self.coach_id}/{self.berth_number}>"
