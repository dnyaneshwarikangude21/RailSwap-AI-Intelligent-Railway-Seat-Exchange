import secrets
from datetime import date, timedelta

from backend.constants import EVENT_CREATED
from backend.extensions import db
from backend.models import (
    Berth,
    Booking,
    Coach,
    ExchangeEvent,
    ExchangeRequest,
    Journey,
    Preference,
    Train,
    User,
)

PASSWORD = "Password@123"
ADMIN_PASSWORD = "Admin@12345"
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


def make_user(
    app,
    email,
    display_name="Test Passenger",
    role="user",
    password=PASSWORD,
    share_display_name=True,
):
    with app.app_context():
        user = User(
            display_name=display_name,
            email=email,
            role=role,
            share_display_name=share_display_name,
        )
        user.set_password(password)
        db.session.add(user)
        db.session.commit()
        return user.id


def make_journey(
    app,
    train_number="99001",
    train_name="Test Fictional Express",
    source="Test Source",
    destination="Test Destination",
    offset_days=7,
    coach_numbers=("S1", "S2"),
):
    with app.app_context():
        train = Train(
            train_number=train_number,
            train_name=train_name,
            source=source,
            destination=destination,
        )
        db.session.add(train)
        db.session.flush()
        journey = Journey(
            train_id=train.id,
            journey_date=date.today() + timedelta(days=offset_days),
            departure_time="18:20",
            arrival_time="07:45",
        )
        db.session.add(journey)
        db.session.flush()
        coach_map = {}
        for coach_number in coach_numbers:
            coach = Coach(
                journey_id=journey.id,
                coach_number=coach_number,
                coach_type="SLEEPER",
                berth_count=len(BERTH_PATTERN),
            )
            db.session.add(coach)
            db.session.flush()
            berths = {}
            for number, berth_type in enumerate(BERTH_PATTERN, start=1):
                berth = Berth(
                    coach_id=coach.id,
                    berth_number=number,
                    berth_type=berth_type,
                )
                db.session.add(berth)
                db.session.flush()
                berths[number] = berth.id
            coach_map[coach_number] = {"id": coach.id, "berths": berths}
        db.session.commit()
        return {
            "train_id": train.id,
            "journey_id": journey.id,
            "coaches": coach_map,
        }


def make_booking(
    app,
    user_id,
    journey,
    coach_number="S1",
    berth_number=1,
    desired_berth_type=None,
    coach_scope="ANY",
    reference=None,
):
    with app.app_context():
        berth_id = journey["coaches"][coach_number]["berths"][berth_number]
        booking = Booking(
            user_id=user_id,
            journey_id=journey["journey_id"],
            berth_id=berth_id,
            demo_booking_reference=reference
            or f"DEMO-{secrets.token_hex(4).upper()}",
            verification_status="SIMULATED_VERIFIED",
        )
        db.session.add(booking)
        db.session.flush()
        preference = None
        if desired_berth_type:
            preference = Preference(
                booking_id=booking.id,
                desired_berth_type=desired_berth_type,
                coach_scope=coach_scope,
            )
            db.session.add(preference)
            db.session.flush()
        db.session.commit()
        return {
            "booking_id": booking.id,
            "preference_id": preference.id if preference else None,
            "user_id": user_id,
            "journey_id": journey["journey_id"],
            "coach_id": journey["coaches"][coach_number]["id"],
            "berth_id": berth_id,
            "berth_number": berth_number,
        }


def make_pending_exchange(app, requester_booking_id, recipient_booking_id, score=80.0):
    with app.app_context():
        exchange = ExchangeRequest(
            requester_booking_id=requester_booking_id,
            recipient_booking_id=recipient_booking_id,
            status="PENDING",
            compatibility_score=score,
        )
        db.session.add(exchange)
        db.session.flush()
        requester = db.session.get(Booking, requester_booking_id)
        db.session.add(
            ExchangeEvent(
                exchange_request_id=exchange.id,
                actor_user_id=requester.user_id,
                event_type=EVENT_CREATED,
            )
        )
        db.session.commit()
        return exchange.id


def login_headers(client, email, password=PASSWORD):
    response = client.post(
        "/api/auth/login", json={"email": email, "password": password}
    )
    assert response.status_code == 200, response.get_json()
    token = response.get_json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
