"""Idempotent synthetic demonstration-data seeder.

Usage:
    python -m backend.seed
    python -m backend.seed --reset
"""

import argparse
from datetime import date, timedelta

from backend import create_app
from backend.constants import (
    EVENT_ACCEPTED,
    EVENT_CREATED,
    EVENT_DECLINED,
    EXCHANGE_ACCEPTED_BY_BOTH,
    EXCHANGE_DECLINED,
    EXCHANGE_PENDING,
)
from backend.extensions import db
from backend.models import (
    Berth,
    Booking,
    Coach,
    ExchangeEvent,
    ExchangeRequest,
    Journey,
    Notification,
    Preference,
    Train,
    User,
)
from backend.services.matching_service import evaluate_candidate
from backend.services.scoring_service import candidate_features
from backend.utils import utcnow

BERTH_PATTERN = [
    "LOWER",
    "MIDDLE",
    "UPPER",
    "LOWER",
    "MIDDLE",
    "UPPER",
    "SIDE_LOWER",
    "SIDE_UPPER",
] * 3

DEMO_PASSWORD = "Demo@1234"
ADMIN_PASSWORD = "Admin@12345"
DEMO_TRAIN_NUMBERS = ("99001", "99002", "99003")

DEMO_USERS = [
    ("Aarav Demo", "aarav@railswap.demo", "user", True),
    ("Priya Demo", "priya@railswap.demo", "user", True),
    ("Rohan Demo", "rohan@railswap.demo", "user", True),
    ("Ananya Demo", "ananya@railswap.demo", "user", True),
    ("Vikram Demo", "vikram@railswap.demo", "user", True),
    ("Meera Demo", "meera@railswap.demo", "user", False),
]

TRAINS = [
    {
        "train_number": "99001",
        "train_name": "Aurora Coastal Express",
        "source": "Aurora Junction",
        "destination": "Coral Bay Central",
        "departure_time": "18:20",
        "arrival_time": "07:45",
        "day_offset": 7,
    },
    {
        "train_number": "99002",
        "train_name": "Nimbus Highlands Express",
        "source": "Nimbus City",
        "destination": "Verdant Valley",
        "departure_time": "06:10",
        "arrival_time": "14:35",
        "day_offset": 11,
    },
    {
        "train_number": "99003",
        "train_name": "Sapphire Lake Night Mail",
        "source": "Westhaven",
        "destination": "Eastmere Lake",
        "departure_time": "21:05",
        "arrival_time": "08:15",
        "day_offset": 14,
    },
]


def _ensure_user(app, display_name, email, role, password, share_display_name=True):
    user = User.query.filter_by(email=email).first()
    if user is None:
        user = User(
            display_name=display_name,
            email=email,
            role=role,
            share_display_name=share_display_name,
        )
        user.set_password(password)
        db.session.add(user)
        db.session.flush()
    return user


def _ensure_berths(coach):
    existing = {
        berth.berth_number: berth
        for berth in Berth.query.filter_by(coach_id=coach.id).all()
    }
    for number, berth_type in enumerate(BERTH_PATTERN, start=1):
        if number not in existing:
            berth = Berth(
                coach_id=coach.id,
                berth_number=number,
                berth_type=berth_type,
            )
            db.session.add(berth)
            existing[number] = berth
    db.session.flush()
    return existing


def _ensure_booking(user, journey, coach, berth_number, reference):
    berth_by_number = _ensure_berths(coach)
    berth = berth_by_number[berth_number]
    booking = Booking.query.filter_by(demo_booking_reference=reference).first()
    if booking is None:
        booking = Booking(
            user_id=user.id,
            journey_id=journey.id,
            berth_id=berth.id,
            demo_booking_reference=reference,
            verification_status="SIMULATED_VERIFIED",
        )
        db.session.add(booking)
        db.session.flush()
    return booking


def _ensure_preference(booking, desired_type, coach_scope="ANY"):
    preference = Preference.query.filter_by(booking_id=booking.id).first()
    if preference is None:
        preference = Preference(
            booking_id=booking.id,
            desired_berth_type=desired_type,
            coach_scope=coach_scope,
        )
        db.session.add(preference)
        db.session.flush()
    else:
        preference.desired_berth_type = desired_type
        preference.coach_scope = coach_scope
    return preference


def _score_pair(requester_booking, recipient_booking):
    eligibility = evaluate_candidate(
        requester_booking,
        recipient_booking,
        requester_preference=requester_booking.preference,
        candidate_preference=recipient_booking.preference,
    )
    _features, details = candidate_features(
        requester_booking, recipient_booking, eligibility
    )
    return details["score"]


def _ensure_exchange(requester_booking, recipient_booking, status):
    existing = ExchangeRequest.query.filter(
        ExchangeRequest.requester_booking_id == requester_booking.id,
        ExchangeRequest.recipient_booking_id == recipient_booking.id,
    ).first()
    if existing:
        return existing
    exchange = ExchangeRequest(
        requester_booking_id=requester_booking.id,
        recipient_booking_id=recipient_booking.id,
        status=status,
        compatibility_score=_score_pair(requester_booking, recipient_booking),
    )
    db.session.add(exchange)
    db.session.flush()
    db.session.add(
        ExchangeEvent(
            exchange_request_id=exchange.id,
            actor_user_id=requester_booking.user_id,
            event_type=EVENT_CREATED,
        )
    )
    if status == EXCHANGE_ACCEPTED_BY_BOTH:
        db.session.add(
            ExchangeEvent(
                exchange_request_id=exchange.id,
                actor_user_id=recipient_booking.user_id,
                event_type=EVENT_ACCEPTED,
            )
        )
        db.session.add(
            Notification(
                user_id=requester_booking.user_id,
                title="Demo exchange accepted",
                message=(
                    "Synthetic demo data: the recipient accepted an application-level "
                    "exchange request. This is not official railway authorization."
                ),
            )
        )
    elif status == EXCHANGE_DECLINED:
        db.session.add(
            ExchangeEvent(
                exchange_request_id=exchange.id,
                actor_user_id=recipient_booking.user_id,
                event_type=EVENT_DECLINED,
            )
        )
    elif status == EXCHANGE_PENDING:
        db.session.add(
            Notification(
                user_id=recipient_booking.user_id,
                title="New demo exchange request",
                message=(
                    "Synthetic demo data: a co-passenger requested a consent-based "
                    "berth exchange. Review it in Exchange Requests."
                ),
            )
        )
    return exchange


def seed_data(reset=False):
    app = create_app()
    with app.app_context():
        if reset:
            db.drop_all()
            db.create_all()
            print("Database reset.")

        existing = Train.query.filter(
            Train.train_number.in_(DEMO_TRAIN_NUMBERS)
        ).first()
        if existing and not reset:
            print(
                "Demo data already exists. Use --reset to rebuild the synthetic dataset."
            )
            return

        admin = _ensure_user(
            app,
            "Demo Administrator",
            "admin@railswap.demo",
            "admin",
            ADMIN_PASSWORD,
            True,
        )
        users = {}
        for display_name, email, role, share_display_name in DEMO_USERS:
            users[email] = _ensure_user(
                app,
                display_name,
                email,
                role,
                DEMO_PASSWORD,
                share_display_name,
            )

        journey_by_train = {}
        coach_by_key = {}
        today = date.today()
        for train_spec in TRAINS:
            train = Train.query.filter_by(
                train_number=train_spec["train_number"]
            ).first()
            if train is None:
                train = Train(
                    train_number=train_spec["train_number"],
                    train_name=train_spec["train_name"],
                    source=train_spec["source"],
                    destination=train_spec["destination"],
                )
                db.session.add(train)
                db.session.flush()

            journey = Journey.query.filter_by(
                train_id=train.id,
                journey_date=today + timedelta(days=train_spec["day_offset"]),
                departure_time=train_spec["departure_time"],
            ).first()
            if journey is None:
                journey = Journey(
                    train_id=train.id,
                    journey_date=today + timedelta(days=train_spec["day_offset"]),
                    departure_time=train_spec["departure_time"],
                    arrival_time=train_spec["arrival_time"],
                )
                db.session.add(journey)
                db.session.flush()
            journey_by_train[train_spec["train_number"]] = journey

            for coach_number, coach_type in (
                ("S1", "SLEEPER"),
                ("S2", "SLEEPER"),
                ("B1", "3A"),
                ("A1", "2A"),
            ):
                key = (train_spec["train_number"], coach_number)
                coach = Coach.query.filter_by(
                    journey_id=journey.id, coach_number=coach_number
                ).first()
                if coach is None:
                    coach = Coach(
                        journey_id=journey.id,
                        coach_number=coach_number,
                        coach_type=coach_type,
                        berth_count=len(BERTH_PATTERN),
                    )
                    db.session.add(coach)
                    db.session.flush()
                _ensure_berths(coach)
                coach_by_key[key] = coach

        journey_one = journey_by_train["99001"]
        journey_two = journey_by_train["99002"]

        aarav_booking = _ensure_booking(
            users["aarav@railswap.demo"],
            journey_one,
            coach_by_key[("99001", "S1")],
            1,
            "DEMO-AARAV-J1",
        )
        priya_booking = _ensure_booking(
            users["priya@railswap.demo"],
            journey_one,
            coach_by_key[("99001", "S1")],
            3,
            "DEMO-PRIYA-J1",
        )
        rohan_booking = _ensure_booking(
            users["rohan@railswap.demo"],
            journey_one,
            coach_by_key[("99001", "S1")],
            2,
            "DEMO-ROHAN-J1",
        )
        ananya_booking = _ensure_booking(
            users["ananya@railswap.demo"],
            journey_one,
            coach_by_key[("99001", "S1")],
            7,
            "DEMO-ANANYA-J1",
        )
        vikram_booking = _ensure_booking(
            users["vikram@railswap.demo"],
            journey_one,
            coach_by_key[("99001", "S1")],
            6,
            "DEMO-VIKRAM-J1",
        )
        meera_booking = _ensure_booking(
            users["meera@railswap.demo"],
            journey_one,
            coach_by_key[("99001", "S2")],
            4,
            "DEMO-MEERA-J1",
        )

        aarav_j2 = _ensure_booking(
            users["aarav@railswap.demo"],
            journey_two,
            coach_by_key[("99002", "B1")],
            1,
            "DEMO-AARAV-J2",
        )
        priya_j2 = _ensure_booking(
            users["priya@railswap.demo"],
            journey_two,
            coach_by_key[("99002", "B1")],
            3,
            "DEMO-PRIYA-J2",
        )

        _ensure_preference(aarav_booking, "UPPER", "ANY")
        _ensure_preference(priya_booking, "LOWER", "ANY")
        _ensure_preference(rohan_booking, "SIDE_LOWER", "SAME_COACH")
        _ensure_preference(ananya_booking, "MIDDLE", "SAME_COACH")
        _ensure_preference(vikram_booking, "LOWER", "ANY")
        _ensure_preference(meera_booking, "UPPER", "ANY")
        _ensure_preference(aarav_j2, "UPPER", "SAME_COACH")
        _ensure_preference(priya_j2, "LOWER", "SAME_COACH")

        _ensure_exchange(aarav_booking, priya_booking, EXCHANGE_PENDING)
        _ensure_exchange(vikram_booking, meera_booking, EXCHANGE_DECLINED)
        _ensure_exchange(aarav_j2, priya_j2, EXCHANGE_ACCEPTED_BY_BOTH)

        db.session.commit()

        print("Synthetic demonstration data created.")
        print(f"Admin: admin@railswap.demo / {ADMIN_PASSWORD}")
        print(
            "Passenger demo account: aarav@railswap.demo / "
            f"{DEMO_PASSWORD} (other demo passengers use the same password)"
        )
        print("Use docs/USER_GUIDE.md for the guided demo flow.")
        print("All records are synthetic; no railway system is contacted.")


def main():
    parser = argparse.ArgumentParser(description="Seed RailSwap AI demo data")
    parser.add_argument(
        "--reset",
        action="store_true",
        help="Drop and recreate all tables before seeding",
    )
    args = parser.parse_args()
    seed_data(reset=args.reset)


if __name__ == "__main__":
    main()
