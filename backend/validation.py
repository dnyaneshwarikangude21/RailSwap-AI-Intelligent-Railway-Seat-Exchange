import re

from flask import request

from backend.errors import ApiError

EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def json_body() -> dict:
    if not request.is_json:
        raise ApiError(
            "A JSON request body is required.", 415, "UNSUPPORTED_MEDIA_TYPE"
        )
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        raise ApiError("The JSON body must be an object.", 400, "INVALID_JSON")
    return payload


def clean_string(value, field, min_length=1, max_length=255, required=True):
    if value is None:
        if required:
            raise ApiError(f"{field} is required.", 400, "VALIDATION_ERROR")
        return None
    if not isinstance(value, str):
        raise ApiError(f"{field} must be a string.", 400, "VALIDATION_ERROR")
    value = value.strip()
    if required and len(value) < min_length:
        raise ApiError(
            f"{field} must be at least {min_length} character(s).",
            400,
            "VALIDATION_ERROR",
        )
    if len(value) > max_length:
        raise ApiError(
            f"{field} must be at most {max_length} characters.",
            400,
            "VALIDATION_ERROR",
        )
    return value or None


def clean_email(value):
    email = clean_string(value, "Email", max_length=255)
    email = email.lower()
    if not EMAIL_PATTERN.match(email):
        raise ApiError("Enter a valid email address.", 400, "VALIDATION_ERROR")
    return email


def clean_password(value):
    password = clean_string(value, "Password", min_length=8, max_length=128)
    return password


def require_int(value, field, minimum=None):
    if isinstance(value, bool):
        raise ApiError(f"{field} must be an integer.", 400, "VALIDATION_ERROR")
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        raise ApiError(f"{field} must be an integer.", 400, "VALIDATION_ERROR")
    if minimum is not None and parsed < minimum:
        raise ApiError(
            f"{field} must be at least {minimum}.", 400, "VALIDATION_ERROR"
        )
    return parsed
