import secrets
from datetime import date, datetime, timezone


def utcnow() -> datetime:
    """Return a naive UTC datetime for consistent SQLite storage."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def isoformat(value):
    if value is None:
        return None
    if isinstance(value, datetime):
        suffix = "Z"
        return value.replace(microsecond=0).isoformat() + suffix
    if isinstance(value, date):
        return value.isoformat()
    return value


def generate_demo_reference() -> str:
    return f"DEMO-{secrets.token_hex(4).upper()}"


def normalize_berth_type(value) -> str:
    return str(value or "").strip().upper().replace(" ", "_").replace("-", "_")


def normalize_coach_scope(value) -> str:
    return str(value or "").strip().upper().replace(" ", "_").replace("-", "_")


def parse_iso_date(value):
    if value in (None, ""):
        return None
    if isinstance(value, date):
        return value
    try:
        return date.fromisoformat(str(value))
    except ValueError:
        return None
