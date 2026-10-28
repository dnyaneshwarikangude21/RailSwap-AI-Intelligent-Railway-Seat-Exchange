from backend.tests.helpers import (
    ADMIN_PASSWORD,
    login_headers,
    make_booking,
    make_journey,
    make_user,
)

API = "/api/exchanges"


def _exchange_world(app):
    a = make_user(app, "requester@example.test", "Requester Demo")
    b = make_user(app, "recipient@example.test", "Recipient Demo")
    c = make_user(app, "outsider@example.test", "Outsider Demo")
    admin = make_user(
        app,
        "admin@example.test",
        "Admin Demo",
        role="admin",
        password=ADMIN_PASSWORD,
    )
    journey = make_journey(app, train_number="99201")
    a_booking = make_booking(
        app, a, journey, "S1", 1, desired_berth_type="UPPER"
    )
    b_booking = make_booking(
        app, b, journey, "S1", 3, desired_berth_type="LOWER"
    )
    a_second = make_booking(
        app, a, journey, "S1", 6, desired_berth_type="LOWER"
    )
    return {
        "a": a,
        "b": b,
        "c": c,
        "admin": admin,
        "journey": journey,
        "a_booking": a_booking,
        "b_booking": b_booking,
        "a_second": a_second,
    }


def _create(client, headers, world):
    return client.post(
        API,
        headers=headers,
        json={
            "requester_booking_id": world["a_booking"]["booking_id"],
            "recipient_booking_id": world["b_booking"]["booking_id"],
        },
    )


def test_create_and_accept_exchange_without_claiming_official_change(client, app):
    world = _exchange_world(app)
    requester_headers = login_headers(client, "requester@example.test")
    recipient_headers = login_headers(client, "recipient@example.test")

    created = _create(client, requester_headers, world)
    assert created.status_code == 201
    exchange = created.get_json()["exchange"]
    assert exchange["status"] == "PENDING"
    assert exchange["direction"] == "OUTGOING"
    assert exchange["official_change"] is False
    assert 0 <= exchange["compatibility_score"] <= 100

    self_accept = client.post(
        f"{API}/{exchange['id']}/accept", headers=requester_headers
    )
    assert self_accept.status_code == 403

    accepted = client.post(
        f"{API}/{exchange['id']}/accept", headers=recipient_headers
    )
    assert accepted.status_code == 200
    accepted_exchange = accepted.get_json()["exchange"]
    assert accepted_exchange["status"] == "ACCEPTED_BY_BOTH"
    assert accepted_exchange["status"] != "COMPLETED"
    assert accepted_exchange["official_change"] is False
    assert any(
        event["event_type"] == "RECIPIENT_ACCEPTED"
        for event in accepted_exchange["events"]
    )

    repeated = client.post(
        f"{API}/{exchange['id']}/decline", headers=recipient_headers
    )
    assert repeated.status_code == 409
    assert repeated.get_json()["error"]["code"] == "INVALID_STATE_TRANSITION"

    notifications = client.get("/api/notifications", headers=requester_headers)
    assert notifications.status_code == 200
    assert notifications.get_json()["count"] >= 1


def test_decline_and_new_request_after_terminal_state(client, app):
    world = _exchange_world(app)
    requester_headers = login_headers(client, "requester@example.test")
    recipient_headers = login_headers(client, "recipient@example.test")

    created = _create(client, requester_headers, world).get_json()["exchange"]
    declined = client.post(
        f"{API}/{created['id']}/decline", headers=recipient_headers
    )
    assert declined.status_code == 200
    assert declined.get_json()["exchange"]["status"] == "DECLINED"

    retry = _create(client, requester_headers, world)
    assert retry.status_code == 201
    assert retry.get_json()["exchange"]["status"] == "PENDING"


def test_self_exchange_and_duplicate_active_requests_are_rejected(client, app):
    world = _exchange_world(app)
    requester_headers = login_headers(client, "requester@example.test")
    recipient_headers = login_headers(client, "recipient@example.test")

    self_attempt = client.post(
        API,
        headers=requester_headers,
        json={
            "requester_booking_id": world["a_booking"]["booking_id"],
            "recipient_booking_id": world["a_second"]["booking_id"],
        },
    )
    assert self_attempt.status_code == 400
    assert (
        self_attempt.get_json()["error"]["code"] == "SELF_EXCHANGE_NOT_ALLOWED"
    )

    assert _create(client, requester_headers, world).status_code == 201
    duplicate = _create(client, requester_headers, world)
    assert duplicate.status_code == 409
    assert duplicate.get_json()["error"]["code"] == "ACTIVE_EXCHANGE_CONFLICT"

    reverse = client.post(
        API,
        headers=recipient_headers,
        json={
            "requester_booking_id": world["b_booking"]["booking_id"],
            "recipient_booking_id": world["a_booking"]["booking_id"],
        },
    )
    assert reverse.status_code == 409
    assert reverse.get_json()["error"]["code"] == "ACTIVE_EXCHANGE_CONFLICT"


def test_only_recipient_can_accept_and_participants_can_cancel(client, app):
    world = _exchange_world(app)
    requester_headers = login_headers(client, "requester@example.test")
    recipient_headers = login_headers(client, "recipient@example.test")
    outsider_headers = login_headers(client, "outsider@example.test")

    created = _create(client, requester_headers, world).get_json()["exchange"]
    unauthorized = client.post(
        f"{API}/{created['id']}/accept", headers=outsider_headers
    )
    assert unauthorized.status_code == 403

    cancelled = client.post(
        f"{API}/{created['id']}/cancel", headers=requester_headers
    )
    assert cancelled.status_code == 200
    assert cancelled.get_json()["exchange"]["status"] == "CANCELLED"

    late_accept = client.post(
        f"{API}/{created['id']}/accept", headers=recipient_headers
    )
    assert late_accept.status_code == 409


def test_unassigned_booking_cannot_be_used_by_requester(client, app):
    world = _exchange_world(app)
    outsider_headers = login_headers(client, "outsider@example.test")
    response = _create(client, outsider_headers, world)
    assert response.status_code == 403
    assert response.get_json()["error"]["code"] == "FORBIDDEN"


def test_admin_simulated_authorization_state_machine(client, app):
    world = _exchange_world(app)
    requester_headers = login_headers(client, "requester@example.test")
    recipient_headers = login_headers(client, "recipient@example.test")
    admin_headers = login_headers(
        client, "admin@example.test", password=ADMIN_PASSWORD
    )

    created = _create(client, requester_headers, world).get_json()["exchange"]
    accepted = client.post(
        f"{API}/{created['id']}/accept", headers=recipient_headers
    )
    assert accepted.get_json()["exchange"]["status"] == "ACCEPTED_BY_BOTH"

    premature = client.post(
        f"/api/admin/exchanges/{created['id']}/advance",
        headers=admin_headers,
        json={"target_status": "COMPLETED"},
    )
    assert premature.status_code == 409

    user_attempt = client.post(
        f"/api/admin/exchanges/{created['id']}/advance",
        headers=requester_headers,
        json={"target_status": "AWAITING_EXTERNAL_AUTHORIZATION"},
    )
    assert user_attempt.status_code == 403

    awaiting = client.post(
        f"/api/admin/exchanges/{created['id']}/advance",
        headers=admin_headers,
        json={"target_status": "AWAITING_EXTERNAL_AUTHORIZATION"},
    )
    assert awaiting.status_code == 200
    assert (
        awaiting.get_json()["exchange"]["status"]
        == "AWAITING_EXTERNAL_AUTHORIZATION"
    )

    completed = client.post(
        f"/api/admin/exchanges/{created['id']}/advance",
        headers=admin_headers,
        json={"target_status": "COMPLETED"},
    )
    assert completed.status_code == 200
    assert completed.get_json()["exchange"]["status"] == "COMPLETED"

    cannot_cancel = client.post(
        f"{API}/{created['id']}/cancel", headers=requester_headers
    )
    assert cannot_cancel.status_code == 409


def test_exchange_export_is_non_sensitive(client, app):
    world = _exchange_world(app)
    requester_headers = login_headers(client, "requester@example.test")
    assert _create(client, requester_headers, world).status_code == 201
    response = client.get(f"{API}/export", headers=requester_headers)
    assert response.status_code == 200
    assert "attachment" in response.headers["Content-Disposition"]
    text = response.get_data(as_text=True)
    assert "@example.test" not in text
    assert "demo_booking_reference" not in text
    assert "SYNTHETIC_DEMONSTRATION_DATA" in text
