from backend.tests.helpers import (
    ADMIN_PASSWORD,
    login_headers,
    make_booking,
    make_journey,
    make_user,
)


def _permission_world(app):
    owner = make_user(app, "owner@example.test", "Owner Demo")
    other = make_user(app, "other@example.test", "Other Demo")
    admin = make_user(
        app,
        "admin2@example.test",
        "Admin Demo",
        role="admin",
        password=ADMIN_PASSWORD,
    )
    journey = make_journey(app, train_number="99301")
    owner_booking = make_booking(
        app, owner, journey, "S1", 1, desired_berth_type="UPPER"
    )
    other_booking = make_booking(
        app, other, journey, "S1", 3, desired_berth_type="LOWER"
    )
    return {
        "owner": owner,
        "other": other,
        "admin": admin,
        "journey": journey,
        "owner_booking": owner_booking,
        "other_booking": other_booking,
    }


def test_booking_ownership_on_read_update_and_delete(client, app):
    world = _permission_world(app)
    other_headers = login_headers(client, "other@example.test")
    booking_id = world["owner_booking"]["booking_id"]

    read = client.get(f"/api/bookings/{booking_id}", headers=other_headers)
    assert read.status_code == 403
    update = client.put(
        f"/api/bookings/{booking_id}",
        headers=other_headers,
        json={"berth_id": world["owner_booking"]["berth_id"]},
    )
    assert update.status_code == 403
    delete = client.delete(f"/api/bookings/{booking_id}", headers=other_headers)
    assert delete.status_code == 403

    owner_headers = login_headers(client, "owner@example.test")
    assert (
        client.get(f"/api/bookings/{booking_id}", headers=owner_headers).status_code
        == 200
    )


def test_preference_ownership(client, app):
    world = _permission_world(app)
    other_headers = login_headers(client, "other@example.test")
    response = client.put(
        f"/api/preferences/{world['owner_booking']['preference_id']}",
        headers=other_headers,
        json={"desired_berth_type": "LOWER"},
    )
    assert response.status_code == 403

    response = client.post(
        "/api/preferences",
        headers=other_headers,
        json={
            "booking_id": world["owner_booking"]["booking_id"],
            "desired_berth_type": "LOWER",
        },
    )
    assert response.status_code == 403


def test_admin_routes_are_role_protected(client, app):
    _permission_world(app)
    user_headers = login_headers(client, "owner@example.test")
    admin_headers = login_headers(
        client, "admin2@example.test", password=ADMIN_PASSWORD
    )

    assert client.get("/api/admin/overview").status_code == 401
    assert (
        client.get("/api/admin/overview", headers=user_headers).status_code == 403
    )
    admin_response = client.get("/api/admin/overview", headers=admin_headers)
    assert admin_response.status_code == 200
    assert admin_response.get_json()["privacy_note"]


def test_admin_cannot_use_private_booking_endpoint_and_sees_redacted_exchanges(
    client, app
):
    world = _permission_world(app)
    admin_headers = login_headers(
        client, "admin2@example.test", password=ADMIN_PASSWORD
    )
    booking_id = world["owner_booking"]["booking_id"]
    response = client.get(f"/api/bookings/{booking_id}", headers=admin_headers)
    assert response.status_code == 403

    owner_headers = login_headers(client, "owner@example.test")
    created = client.post(
        "/api/exchanges",
        headers=owner_headers,
        json={
            "requester_booking_id": booking_id,
            "recipient_booking_id": world["other_booking"]["booking_id"],
        },
    )
    assert created.status_code == 201

    exchanges = client.get("/api/admin/exchanges", headers=admin_headers)
    assert exchanges.status_code == 200
    payload = exchanges.get_json()
    assert payload["items"]
    serialized = str(payload)
    assert "Owner Demo" not in serialized
    assert "owner@example.test" not in serialized
    assert "DEMO-" not in serialized
    assert payload["items"][0]["passenger_data"] == "REDACTED"


def test_notification_ownership(client, app):
    world = _permission_world(app)
    owner_headers = login_headers(client, "owner@example.test")
    other_headers = login_headers(client, "other@example.test")

    created = client.post(
        "/api/exchanges",
        headers=owner_headers,
        json={
            "requester_booking_id": world["owner_booking"]["booking_id"],
            "recipient_booking_id": world["other_booking"]["booking_id"],
        },
    )
    assert created.status_code == 201
    other_notifications = client.get(
        "/api/notifications", headers=other_headers
    ).get_json()["items"]
    assert other_notifications
    notification_id = other_notifications[0]["id"]
    forbidden = client.post(
        f"/api/notifications/{notification_id}/read", headers=owner_headers
    )
    assert forbidden.status_code == 403
    allowed = client.post(
        f"/api/notifications/{notification_id}/read", headers=other_headers
    )
    assert allowed.status_code == 200
    assert allowed.get_json()["notification"]["read"] is True


def test_unknown_exchange_returns_404(client, app):
    _permission_world(app)
    headers = login_headers(client, "owner@example.test")
    assert client.get("/api/exchanges/99999", headers=headers).status_code == 404
