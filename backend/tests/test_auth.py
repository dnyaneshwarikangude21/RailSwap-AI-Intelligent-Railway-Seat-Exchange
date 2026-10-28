from backend.extensions import db
from backend.models import User
from backend.tests.helpers import ADMIN_PASSWORD, PASSWORD, login_headers, make_user


def test_register_success_returns_token_and_safe_user(client, app):
    response = client.post(
        "/api/auth/register",
        json={
            "display_name": "New Passenger",
            "email": "new@example.test",
            "password": "StrongPass123",
        },
    )
    assert response.status_code == 201
    body = response.get_json()
    assert body["access_token"]
    assert body["user"]["email"] == "new@example.test"
    assert body["user"]["role"] == "user"
    assert "password_hash" not in body["user"]
    with app.app_context():
        user = User.query.filter_by(email="new@example.test").one()
        assert user.password_hash != "StrongPass123"
        assert user.check_password("StrongPass123")


def test_duplicate_registration_is_rejected(client):
    payload = {
        "display_name": "Duplicate User",
        "email": "duplicate@example.test",
        "password": "StrongPass123",
    }
    assert client.post("/api/auth/register", json=payload).status_code == 201
    response = client.post("/api/auth/register", json=payload)
    assert response.status_code == 409
    assert response.get_json()["error"]["code"] == "EMAIL_IN_USE"


def test_registration_validation(client):
    response = client.post(
        "/api/auth/register",
        json={
            "display_name": "X",
            "email": "not-an-email",
            "password": "short",
        },
    )
    assert response.status_code == 400
    assert response.get_json()["error"]["code"] == "VALIDATION_ERROR"

    response = client.post(
        "/api/auth/register",
        data="not-json",
        content_type="text/plain",
    )
    assert response.status_code == 415


def test_login_success_and_wrong_password(client, app):
    make_user(app, "login@example.test", display_name="Login Tester")
    success = client.post(
        "/api/auth/login",
        json={"email": "login@example.test", "password": PASSWORD},
    )
    assert success.status_code == 200
    assert success.get_json()["user"]["display_name"] == "Login Tester"

    failure = client.post(
        "/api/auth/login",
        json={"email": "login@example.test", "password": "WrongPassword"},
    )
    assert failure.status_code == 401
    assert failure.get_json()["error"]["code"] == "INVALID_CREDENTIALS"


def test_protected_route_requires_token(client):
    response = client.get("/api/auth/me")
    assert response.status_code == 401
    assert response.get_json()["error"]["code"] == "AUTH_REQUIRED"


def test_me_and_profile_update(client, app):
    make_user(app, "profile@example.test", display_name="Before Name")
    headers = login_headers(client, "profile@example.test")
    response = client.get("/api/auth/me", headers=headers)
    assert response.status_code == 200
    assert response.get_json()["user"]["display_name"] == "Before Name"

    update = client.put(
        "/api/auth/me",
        headers=headers,
        json={"display_name": "After Name", "share_display_name": False},
    )
    assert update.status_code == 200
    assert update.get_json()["user"]["display_name"] == "After Name"
    assert update.get_json()["user"]["share_display_name"] is False

    password_change = client.put(
        "/api/auth/me",
        headers=headers,
        json={
            "current_password": PASSWORD,
            "new_password": "NewPassword123",
        },
    )
    assert password_change.status_code == 200
    with app.app_context():
        user = User.query.filter_by(email="profile@example.test").one()
        assert user.check_password("NewPassword123")


def test_admin_login_uses_role(client, app):
    make_user(
        app,
        "admin@example.test",
        display_name="Admin",
        role="admin",
        password=ADMIN_PASSWORD,
    )
    headers = login_headers(
        client, "admin@example.test", password=ADMIN_PASSWORD
    )
    me = client.get("/api/auth/me", headers=headers)
    assert me.status_code == 200
    assert me.get_json()["user"]["role"] == "admin"
