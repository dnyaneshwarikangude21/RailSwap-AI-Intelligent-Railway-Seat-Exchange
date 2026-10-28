# RailSwap AI API Documentation

Version 1.0 | Last verified 28 October 2026

## 1. Overview

The RailSwap AI API is a JSON HTTP API implemented with Flask. It powers authentication, synthetic train and booking data, reciprocal matching, an application-level exchange workflow, notifications, aggregate analytics, ML experiment reporting, and redacted administration.

This API does not connect to any railway reservation, identity, payment, or authorization service. All response data is synthetic or application-generated.

| Item | Value |
|---|---|
| Local base URL | `http://127.0.0.1:5000/api` |
| Frontend development base | `/api` through the Vite proxy |
| Content type | `application/json` except the file export |
| Authentication | Bearer JWT in the `Authorization` header |
| Default token lifetime | 12 hours |
| Maximum request body | 1 MiB |
| Character encoding | UTF-8 |
| Time format | ISO 8601; datetimes are UTC with `Z` |
| Date format | `YYYY-MM-DD` |

The health endpoint is public. Every other endpoint requires a valid JWT unless explicitly marked otherwise.

## 2. Authentication

Send the token returned by login or registration:

```http
Authorization: Bearer <access_token>
```

JWTs contain the application user ID in `sub`. The default development lifetime is 12 hours. Token revocation and refresh endpoints are not implemented.

Typical authentication errors:

| HTTP | Code | Meaning |
|---|---|---|
| 401 | `AUTH_REQUIRED` | No bearer token supplied |
| 401 | `INVALID_TOKEN` | Malformed or invalid token |
| 401 | `TOKEN_EXPIRED` | Token lifetime elapsed |
| 401 | `USER_NOT_FOUND` | Token subject no longer maps to a user |
| 403 | `FORBIDDEN` | Authenticated but role/ownership check failed |

## 3. Error format

All API errors use one envelope:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Display name must be at least 2 character(s).",
    "details": null
  }
}
```

`details` is omitted when no additional context exists. It may be a string, object, or list depending on the error.

Common statuses:

| HTTP | Typical use |
|---|---|
| 200 | Successful read or update |
| 201 | Resource created |
| 204 | Resource deleted; no body |
| 400 | Invalid input or invalid domain request |
| 401 | Missing, invalid, or expired authentication |
| 403 | Role or ownership violation |
| 404 | Resource not found |
| 405 | Method not allowed |
| 409 | Duplicate/conflict/invalid state transition |
| 415 | Request is not JSON |
| 422 | Candidate is not eligible for exchange |
| 500 | Unexpected server error |

## 4. Shared object shapes

### 4.1 User

```json
{
  "id": 2,
  "display_name": "Aarav Demo",
  "email": "aarav@railswap.demo",
  "role": "user",
  "share_display_name": true,
  "created_at": "2026-10-28T17:30:00Z"
}
```

`password_hash` is never returned.

### 4.2 Booking

Bookings include nested journey, coach, berth, and preference data:

```json
{
  "id": 1,
  "user_id": 2,
  "journey_id": 1,
  "berth_id": 1,
  "demo_booking_reference": "DEMO-AARAV-J1",
  "verification_status": "SIMULATED_VERIFIED",
  "verification_note": "Simulated verification for demonstration data only.",
  "created_at": "2026-10-28T17:30:00Z",
  "journey": {},
  "coach": {},
  "berth": {},
  "preference": {},
  "data_mode": "SYNTHETIC_DEMONSTRATION_DATA"
}
```

`GET /api/bookings` and booking detail add `has_active_exchange`.

### 4.3 Preference

```json
{
  "id": 1,
  "booking_id": 1,
  "desired_berth_type": "UPPER",
  "coach_scope": "ANY",
  "created_at": "2026-10-28T17:30:00Z",
  "updated_at": "2026-10-28T17:30:00Z"
}
```

Allowed berth types: `LOWER`, `MIDDLE`, `UPPER`, `SIDE_LOWER`, `SIDE_UPPER`.

Allowed coach scopes: `ANY`, `SAME_COACH`.

### 4.4 Match

A match is a public candidate summary plus explanations and an experimental ML value:

```json
{
  "candidate_booking_id": 4,
  "candidate_display_name": "Ananya Demo",
  "current_berth_type": "SIDE_LOWER",
  "desired_berth_type": "MIDDLE",
  "candidate_coach_number": "S1",
  "candidate_berth_number": 7,
  "same_coach": true,
  "journey": {
    "id": 1,
    "journey_date": "2026-11-04",
    "train_number": "99001",
    "train_name": "Aurora Coastal Express",
    "source": "Aurora Junction",
    "destination": "Coral Bay Central"
  },
  "compatibility_score": 96.88,
  "rank": 1,
  "score_breakdown": {},
  "features": {},
  "eligibility": {},
  "explanation": {},
  "ml": {},
  "limitations": []
}
```

Candidate email, user ID, password data, and booking reference are not returned. If the candidate disabled display-name sharing, `candidate_display_name` is `"Demo passenger"`.

### 4.5 Exchange

```json
{
  "id": 1,
  "status": "PENDING",
  "compatibility_score": 96.88,
  "direction": "OUTGOING",
  "created_at": "2026-10-28T17:30:00Z",
  "updated_at": "2026-10-28T17:30:00Z",
  "requester": {},
  "recipient": {},
  "journey": {},
  "can_accept": false,
  "can_decline": false,
  "can_cancel": true,
  "events": [],
  "official_change": false,
  "notice": "Application-level consent only. No official railway reservation is modified by this prototype.",
  "data_mode": "SYNTHETIC_DEMONSTRATION_DATA"
}
```

`requester` and `recipient` contain `booking_id`, public display name, coach, berth, desired berth type, and coach scope.

## 5. Endpoint summary

| Method | Path | Purpose | Access |
|---|---|---|---|
| GET | `/health` | Service health | Public |
| POST | `/auth/register` | Create passenger account | Public |
| POST | `/auth/login` | Obtain JWT | Public |
| GET | `/auth/me` | Current profile | Authenticated |
| PUT | `/auth/me` | Update profile/password/privacy | Authenticated |
| GET | `/trains` | List/search trains | Authenticated |
| GET | `/trains/{train_id}` | Train and upcoming journeys | Authenticated |
| GET | `/journeys` | List/filter journeys | Authenticated |
| GET | `/journeys/{journey_id}` | Journey berth map | Authenticated |
| GET | `/berths/{berth_id}` | Berth details | Authenticated |
| GET | `/bookings` | Current user's bookings | Authenticated |
| POST | `/bookings` | Create synthetic booking | Authenticated |
| GET | `/bookings/{booking_id}` | Owned booking detail | Owner |
| PUT | `/bookings/{booking_id}` | Change owned booking berth | Owner |
| DELETE | `/bookings/{booking_id}` | Delete booking without exchange history | Owner |
| GET | `/preferences` | Owned preferences | Authenticated |
| POST | `/preferences` | Create preference | Booking owner |
| PUT | `/preferences/{preference_id}` | Update preference | Preference owner |
| POST | `/matching/search` | Reciprocal match search | Booking owner |
| GET | `/matching/{candidate_booking_id}/explanation` | Explain one candidate | Booking owner |
| GET | `/exchanges` | List own exchanges | Authenticated |
| POST | `/exchanges` | Create consent request | Requester booking owner |
| GET | `/exchanges/{exchange_id}` | Exchange detail | Participant |
| POST | `/exchanges/{exchange_id}/accept` | Accept request | Recipient |
| POST | `/exchanges/{exchange_id}/decline` | Decline request | Recipient |
| POST | `/exchanges/{exchange_id}/cancel` | Cancel active request | Participant |
| GET | `/exchanges/export` | Download non-sensitive summary | Authenticated |
| GET | `/notifications` | List notifications | Authenticated |
| POST | `/notifications/{notification_id}/read` | Mark one read | Notification owner |
| POST | `/notifications/read-all` | Mark all read | Authenticated |
| GET | `/analytics/dashboard` | Passenger dashboard | Authenticated |
| GET | `/analytics/ml-metrics` | ML metrics and model status | Authenticated |
| GET | `/admin/overview` | Aggregate system overview | Admin |
| GET | `/admin/exchanges` | Redacted exchange list | Admin |
| POST | `/admin/exchanges/{exchange_id}/advance` | Simulated authorization transition | Admin |

---

## 6. Health

### `GET /api/health`

No authentication.

Response `200`:

```json
{
  "status": "ok",
  "service": "RailSwap AI API",
  "data_mode": "SYNTHETIC_DEMONSTRATION_DATA"
}
```

---

## 7. Authentication and profile

### `POST /api/auth/register`

Request:

```json
{
  "display_name": "New Passenger",
  "email": "new@example.test",
  "password": "StrongPass123"
}
```

Rules:

- `display_name`: 2-80 characters.
- `email`: valid email pattern, normalized to lowercase, unique.
- `password`: 8-128 characters.
- New accounts always have role `user`.

Response `201`:

```json
{
  "access_token": "<jwt>",
  "token_type": "Bearer",
  "user": {},
  "data_mode": "SYNTHETIC_DEMONSTRATION_DATA"
}
```

Errors: `400 VALIDATION_ERROR`, `409 EMAIL_IN_USE`, `415 UNSUPPORTED_MEDIA_TYPE`.

### `POST /api/auth/login`

Request:

```json
{
  "email": "aarav@railswap.demo",
  "password": "Demo@1234"
}
```

Response `200`: same shape as registration.

Error: `401 INVALID_CREDENTIALS`.

### `GET /api/auth/me`

Response `200`:

```json
{ "user": {} }
```

### `PUT /api/auth/me`

Accept any combination of supported fields:

```json
{
  "display_name": "Updated Name",
  "share_display_name": false,
  "current_password": "Demo@1234",
  "new_password": "NewPassword123"
}
```

- `share_display_name` controls whether other passengers see the real display name.
- Password change requires the current password.
- At least one supported field must be supplied.

Errors: `400 VALIDATION_ERROR`, `400 INVALID_CURRENT_PASSWORD`.

---

## 8. Trains, journeys, and berths

### `GET /api/trains`

Query parameters:

| Name | Description |
|---|---|
| `q` | Search train name, number, source, or destination |
| `source` | Case-insensitive source filter |
| `destination` | Case-insensitive destination filter |

Response `200`:

```json
{
  "items": [
    {
      "id": 1,
      "train_number": "99001",
      "train_name": "Aurora Coastal Express",
      "source": "Aurora Junction",
      "destination": "Coral Bay Central",
      "data_mode": "SYNTHETIC_DEMONSTRATION_DATA",
      "journey_count": 1,
      "next_journey": {}
    }
  ],
  "count": 1
}
```

### `GET /api/trains/{train_id}`

Returns `{ "train": {}, "journeys": [] }` for upcoming journeys, including coaches and berths. Error `404 TRAIN_NOT_FOUND`.

### `GET /api/journeys`

Query parameters:

| Name | Description |
|---|---|
| `train_id` | Positive integer filter |
| `source` | Train source filter |
| `destination` | Train destination filter |
| `date` | Exact `YYYY-MM-DD` date |
| `include_past` | `true` to include past journeys; otherwise only today/future |

Response `200`: `{ "items": [], "count": 0 }`.

Errors: `400 VALIDATION_ERROR` for an invalid date or non-integer train ID.

### `GET /api/journeys/{journey_id}`

Returns the journey with coaches and berths. Each berth includes:

```json
{
  "available": false,
  "is_your_booking": true,
  "booking_id": 1
}
```

`booking_id` is exposed only for the current user's own booking; another passenger's booking ID is not revealed here.

Error: `404 JOURNEY_NOT_FOUND`.

### `GET /api/berths/{berth_id}`

Returns `{ "berth": {}, "coach": {} }`. Error `404 BERTH_NOT_FOUND`.

---

## 9. Bookings

### `GET /api/bookings`

Returns the current user's bookings newest first. Each item is a booking object with `has_active_exchange`.

### `POST /api/bookings`

Request:

```json
{
  "journey_id": 1,
  "berth_id": 9
}
```

Rules:

- Journey and berth must exist and match each other.
- Journey must be today or later.
- Berth must not already be occupied on that journey.
- Demo verification status is set to `SIMULATED_VERIFIED`.
- A unique demo reference is generated.

Response `201`: `{ "booking": {} }`.

Errors: `404 JOURNEY_NOT_FOUND`, `404 BERTH_NOT_FOUND`, `400 JOURNEY_EXPIRED`, `400 BERTH_JOURNEY_MISMATCH`, `409 BERTH_OCCUPIED`.

### `GET /api/bookings/{booking_id}`

Owner only. Response `{ "booking": {} }` with `has_active_exchange`.

Errors: `404 BOOKING_NOT_FOUND`, `403 FORBIDDEN`.

### `PUT /api/bookings/{booking_id}`

Only `berth_id` may be changed:

```json
{ "berth_id": 10 }
```

Rejected while the booking participates in an active exchange. Response `200`.

Errors: `400 VALIDATION_ERROR`, `400 BERTH_JOURNEY_MISMATCH`, `409 ACTIVE_EXCHANGE_CONFLICT`, `409 BERTH_OCCUPIED`, `403 FORBIDDEN`.

### `DELETE /api/bookings/{booking_id}`

Deletes an owned booking only if it has no exchange history. Response `204` with no body.

Errors: `409 BOOKING_HAS_EXCHANGE_HISTORY`, `403 FORBIDDEN`.

---

## 10. Preferences

### `GET /api/preferences`

Optional query parameter `booking_id`. Returns only preferences belonging to the current user's bookings.

### `POST /api/preferences`

Request:

```json
{
  "booking_id": 1,
  "desired_berth_type": "UPPER",
  "coach_scope": "ANY"
}
```

One preference per booking. Response `201`.

Errors: `409 PREFERENCE_EXISTS`, `400 VALIDATION_ERROR`, `403 FORBIDDEN`.

### `PUT /api/preferences/{preference_id}`

Request may contain either or both supported fields:

```json
{
  "desired_berth_type": "MIDDLE",
  "coach_scope": "SAME_COACH"
}
```

Rejected while the related booking is in an active exchange. Response `200`.

Errors: `409 ACTIVE_EXCHANGE_CONFLICT`, `400 VALIDATION_ERROR`, `403 FORBIDDEN`.

---

## 11. Matching

### `POST /api/matching/search`

Request:

```json
{
  "booking_id": 2,
  "limit": 20
}
```

- `booking_id` must belong to the current user and have a preference.
- `limit` is optional, clamped to 1-100.
- Only reciprocal, hard-eligible candidates on the same journey are returned.
- Active-exchange bookings are excluded.
- Ranking uses the deterministic weighted score, descending, with lower candidate booking ID as tie-break.
- ML confidence is included for information and does not alter eligibility or rank.

Response `200`:

```json
{
  "items": [
    {
      "candidate_booking_id": 4,
      "candidate_display_name": "Ananya Demo",
      "compatibility_score": 96.88,
      "rank": 1,
      "ml": {
        "available": true,
        "score": 0.9278,
        "label": "synthetic_compatibility_confidence"
      },
      "eligibility": {
        "eligible": true,
        "checks": [],
        "failed_codes": [],
        "reasons": []
      }
    }
  ],
  "count": 1,
  "meta": {
    "count": 1,
    "candidate_pool": 1,
    "excluded_count": 0,
    "limit": 20,
    "requester_booking_id": 2,
    "requester_has_active_exchange": false,
    "score_method": "deterministic_weighted_baseline",
    "ranking_tie_break": "lower candidate_booking_id",
    "weights": {
      "reciprocal_match": 0.5,
      "preference_compatibility": 0.2,
      "coach_compatibility": 0.15,
      "berth_proximity": 0.15
    },
    "limitations": [],
    "ml": {},
    "generated_at": "2026-10-28T17:30:00Z"
  }
}
```

The sample values reflect a verified synthetic smoke run for Rohan's booking. Actual candidates depend on the current database.

If the booking is already in an active exchange, the requester remains excluded and `meta.requester_has_active_exchange` is `true`.

Errors: `400 PREFERENCE_REQUIRED`, `400 VALIDATION_ERROR`, `404 BOOKING_NOT_FOUND`, `403 FORBIDDEN`.

### `GET /api/matching/{candidate_booking_id}/explanation`

Required query parameter: `booking_id` (the requester's own booking).

Returns the full public match payload plus `meta`. It evaluates the pair even if not currently eligible, allowing the UI to explain failures. It rejects self-matches and candidates on another journey.

Errors: `400 PREFERENCE_REQUIRED`, `400 SELF_EXCHANGE_NOT_ALLOWED`, `404 CANDIDATE_NOT_FOUND`.

---

## 12. Exchange workflow

### Statuses

| Status | Active? | Meaning |
|---|---|---|
| `PENDING` | Yes | Requester created a consent request |
| `ACCEPTED_BY_BOTH` | Yes | Recipient accepted |
| `DECLINED` | No | Recipient declined |
| `CANCELLED` | No | Participant cancelled |
| `AWAITING_EXTERNAL_AUTHORIZATION` | Yes | Administrator started simulated authorization |
| `COMPLETED` | No | Administrator completed simulation |
| `EXPIRED` | No | Administrator expired the request |

### `GET /api/exchanges`

Query parameters:

| Name | Values |
|---|---|
| `status` | Any exchange status |
| `direction` | `INCOMING` or `OUTGOING` |

Returns exchanges where the current user owns either booking. Newest updated first.

### `POST /api/exchanges`

Request:

```json
{
  "requester_booking_id": 2,
  "recipient_booking_id": 4
}
```

The API re-checks ownership and full reciprocal eligibility. Request creation is rejected for self-exchange, missing preferences, ineligible pairs, and any booking already in an active exchange.

Response `201`: `{ "exchange": {} }`.

Errors:

| HTTP | Code |
|---|---|
| 400 | `SELF_EXCHANGE_NOT_ALLOWED` |
| 400 | `PREFERENCE_REQUIRED` |
| 403 | `FORBIDDEN` |
| 404 | `BOOKING_NOT_FOUND` / `CANDIDATE_NOT_FOUND` |
| 409 | `ACTIVE_EXCHANGE_CONFLICT` |
| 422 | `CANDIDATE_NOT_ELIGIBLE` |

An accepted or completed exchange is still not an official railway change. `official_change` remains `false`.

### `GET /api/exchanges/{exchange_id}`

Participant only. Returns `{ "exchange": {} }`. Other users receive `403 FORBIDDEN`; missing IDs return `404 EXCHANGE_NOT_FOUND`.

### `POST /api/exchanges/{exchange_id}/accept`

Recipient only. `PENDING -> ACCEPTED_BY_BOTH`.

Errors: `403 FORBIDDEN`, `409 INVALID_STATE_TRANSITION`.

### `POST /api/exchanges/{exchange_id}/decline`

Recipient only. `PENDING -> DECLINED`.

Errors: `403 FORBIDDEN`, `409 INVALID_STATE_TRANSITION`.

### `POST /api/exchanges/{exchange_id}/cancel`

Either participant. Allowed from `PENDING`, `ACCEPTED_BY_BOTH`, or `AWAITING_EXTERNAL_AUTHORIZATION`.

Errors: `403 FORBIDDEN`, `409 INVALID_STATE_TRANSITION`.

### `GET /api/exchanges/export`

Downloads `railswap-exchange-summary.json` with:

- `exported_at`;
- `data_mode`;
- a non-sensitive notice;
- exchange ID, status, score, viewer role, journey date, train number/name, route, timestamps.

It does not include passenger names, emails, booking references, or ticket data.

---

## 13. Notifications

### `GET /api/notifications`

Query parameters:

| Name | Description |
|---|---|
| `limit` | 1-100, default 50 |
| `unread` | `true` to return unread only |

Response:

```json
{
  "items": [
    {
      "id": 1,
      "title": "New exchange request",
      "message": "A co-passenger sent a consent-based berth exchange request...",
      "read": false,
      "read_at": null,
      "created_at": "2026-10-28T17:30:00Z"
    }
  ],
  "count": 1,
  "unread_count": 1
}
```

### `POST /api/notifications/{notification_id}/read`

Owner only. Returns `{ "notification": {} }`. Errors `404 NOTIFICATION_NOT_FOUND`, `403 FORBIDDEN`.

### `POST /api/notifications/read-all`

Marks all current-user notifications read. Returns:

```json
{
  "updated": 3,
  "read_at": "2026-10-28T17:30:00Z"
}
```

---

## 14. Analytics

### `GET /api/analytics/dashboard`

Passenger-scoped aggregate data:

```json
{
  "stats": {
    "total_bookings": 2,
    "active_exchanges": 1,
    "compatible_matches": 0,
    "pending_responses": 0,
    "completed_exchanges": 0,
    "unread_notifications": 1
  },
  "matching_stats": {
    "bookings_with_preferences": 2,
    "eligible_candidates": 0,
    "average_compatibility_score": null,
    "engine_mode": "ml",
    "limitations": []
  },
  "journeys": [],
  "recent_exchanges": [],
  "recent_activity": [],
  "data_mode": "SYNTHETIC_DEMONSTRATION_DATA",
  "generated_at": "2026-10-28T17:30:00Z"
}
```

Dashboard matching counts are calculated for the current user's bookings, capped at 100 candidates per booking for that aggregate view.

### `GET /api/analytics/ml-metrics`

Returns the saved evaluation report under `metrics`, model load status under `model`, and a synthetic-label notice.

If artifacts are unavailable, `metrics.available` is `false` and matching continues with deterministic fallback.

---

## 15. Administration

All administrator endpoints require an authenticated user with role `admin`. Non-admins receive `403 FORBIDDEN`.

### `GET /api/admin/overview`

Returns aggregate counts:

```json
{
  "counts": {
    "users": 7,
    "admins": 1,
    "trains": 3,
    "journeys": 3,
    "bookings": 8,
    "exchange_requests": 3,
    "notifications": 2,
    "active_exchanges": 2
  },
  "exchange_status_counts": {},
  "ml": {},
  "data_mode": "SYNTHETIC_DEMONSTRATION_DATA",
  "privacy_note": "Administrators see aggregate and exchange-state information only...",
  "generated_at": "2026-10-28T17:30:00Z"
}
```

Count values depend on the current synthetic database.

### `GET /api/admin/exchanges`

Query parameters:

| Name | Description |
|---|---|
| `status` | Optional status filter |
| `limit` | 1-100, default 50 |

Each item contains exchange ID, status, score, timestamps, journey date, train number, route, `passenger_data: "REDACTED"`, and `official_change: false`. Passenger names, emails, booking references, and ticket data are excluded.

### `POST /api/admin/exchanges/{exchange_id}/advance`

Request:

```json
{ "target_status": "AWAITING_EXTERNAL_AUTHORIZATION" }
```

Allowed transitions:

| Current | Target |
|---|---|
| `PENDING` | `EXPIRED` |
| `ACCEPTED_BY_BOTH` | `AWAITING_EXTERNAL_AUTHORIZATION`, `EXPIRED` |
| `AWAITING_EXTERNAL_AUTHORIZATION` | `COMPLETED` |

Response includes the redacted exchange summary and:

```json
{
  "simulation_note": "This administrative action only simulates an external authorization gate. It does not modify or contact any railway reservation system."
}
```

Errors: `404 EXCHANGE_NOT_FOUND`, `409 INVALID_STATE_TRANSITION`, `409 CONCURRENT_UPDATE`.

---

## 16. Data and privacy notes

- Candidate APIs return public identity only. A user who disables display-name sharing appears as `Demo passenger`.
- Booking ownership, preference ownership, notification ownership, and exchange participation are checked server-side.
- Administrators cannot use private booking endpoints to bypass ownership.
- Admin exchange responses are deliberately redacted.
- Export excludes identity, references, and ticket data.
- JWT access tokens are stored in browser `localStorage` in this prototype. This is suitable only for local demonstration; a production design should address HttpOnly cookies, CSRF, revocation, and rotation.
- No rate limiting is included in this academic prototype.
- The application does not contact any railway system and does not claim railway approval.
