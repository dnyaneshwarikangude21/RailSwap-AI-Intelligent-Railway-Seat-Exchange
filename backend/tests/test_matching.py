import json

from backend.tests.helpers import (
    login_headers,
    make_booking,
    make_journey,
    make_pending_exchange,
    make_user,
)


def _reciprocal_world(app):
    a = make_user(app, "a@example.test", "Passenger A")
    b = make_user(app, "b@example.test", "Passenger B")
    c = make_user(app, "c@example.test", "Passenger C")
    d = make_user(app, "d@example.test", "Passenger D")
    e = make_user(app, "e@example.test", "Passenger E")
    journey = make_journey(app, train_number="99101")
    other_journey = make_journey(app, train_number="99102")

    a_booking = make_booking(
        app, a, journey, "S1", 1, desired_berth_type="UPPER", coach_scope="ANY"
    )
    b_booking = make_booking(
        app, b, journey, "S1", 3, desired_berth_type="LOWER", coach_scope="ANY"
    )
    c_booking = make_booking(
        app, c, journey, "S1", 6, desired_berth_type="LOWER", coach_scope="ANY"
    )
    one_sided = make_booking(
        app,
        d,
        journey,
        "S1",
        2,
        desired_berth_type="SIDE_LOWER",
        coach_scope="ANY",
    )
    other_coach_strict = make_booking(
        app,
        e,
        journey,
        "S2",
        3,
        desired_berth_type="LOWER",
        coach_scope="SAME_COACH",
    )
    other_journey_booking = make_booking(
        app,
        d,
        other_journey,
        "S1",
        3,
        desired_berth_type="LOWER",
        coach_scope="ANY",
    )
    return {
        "users": {"a": a, "b": b, "c": c, "d": d, "e": e},
        "journey": journey,
        "other_journey": other_journey,
        "a_booking": a_booking,
        "b_booking": b_booking,
        "c_booking": c_booking,
        "one_sided": one_sided,
        "other_coach_strict": other_coach_strict,
        "other_journey_booking": other_journey_booking,
    }


def test_reciprocal_matching_returns_only_eligible_ranked_candidates(client, app):
    world = _reciprocal_world(app)
    headers = login_headers(client, "a@example.test")
    response = client.post(
        "/api/matching/search",
        headers=headers,
        json={"booking_id": world["a_booking"]["booking_id"]},
    )
    assert response.status_code == 200
    body = response.get_json()
    candidate_ids = [item["candidate_booking_id"] for item in body["items"]]
    assert candidate_ids == [
        world["b_booking"]["booking_id"],
        world["c_booking"]["booking_id"],
    ]
    assert world["one_sided"]["booking_id"] not in candidate_ids
    assert world["other_coach_strict"]["booking_id"] not in candidate_ids
    assert world["other_journey_booking"]["booking_id"] not in candidate_ids
    assert body["items"][0]["rank"] == 1
    assert body["items"][0]["compatibility_score"] > body["items"][1]["compatibility_score"]
    assert body["meta"]["ml"]["mode"] == "rule_based_fallback"
    assert body["items"][0]["ml"]["available"] is False
    for item in body["items"]:
        assert item["eligibility"]["eligible"] is True
        assert all(check["passed"] for check in item["eligibility"]["checks"])
        assert 0 <= item["compatibility_score"] <= 100
        for feature in (
            "reciprocal_match",
            "preference_compatibility",
            "coach_compatibility",
            "berth_proximity",
        ):
            assert 0.0 <= item["features"][feature] <= 1.0
        contribution_total = sum(
            factor["contribution"] for factor in item["score_breakdown"]["contributions"]
        )
        assert round(contribution_total, 2) == item["compatibility_score"]


def test_match_results_do_not_expose_private_identity_or_reference(client, app):
    world = _reciprocal_world(app)
    headers = login_headers(client, "a@example.test")
    response = client.post(
        "/api/matching/search",
        headers=headers,
        json={"booking_id": world["a_booking"]["booking_id"]},
    )
    serialized = json.dumps(response.get_json()).lower()
    assert "b@example.test" not in serialized
    assert "demo-" not in serialized
    assert "password" not in serialized


def test_deterministic_ranking_and_explanation(client, app):
    world = _reciprocal_world(app)
    headers = login_headers(client, "a@example.test")
    first = client.post(
        "/api/matching/search",
        headers=headers,
        json={"booking_id": world["a_booking"]["booking_id"]},
    ).get_json()
    second = client.post(
        "/api/matching/search",
        headers=headers,
        json={"booking_id": world["a_booking"]["booking_id"]},
    ).get_json()
    assert [
        (item["candidate_booking_id"], item["compatibility_score"], item["rank"])
        for item in first["items"]
    ] == [
        (item["candidate_booking_id"], item["compatibility_score"], item["rank"])
        for item in second["items"]
    ]

    candidate_id = first["items"][0]["candidate_booking_id"]
    explanation = client.get(
        f"/api/matching/{candidate_id}/explanation",
        headers=headers,
        query_string={"booking_id": world["a_booking"]["booking_id"]},
    )
    assert explanation.status_code == 200
    match = explanation.get_json()["match"]
    assert match["eligibility"]["eligible"] is True
    assert "Both directional preferences" in match["explanation"]["summary"]
    assert match["explanation"]["factors"]
    assert any(
        "official railway" in limitation.lower()
        for limitation in match["explanation"]["limitations"]
    )


def test_active_exchange_blocks_matching_and_candidate(client, app):
    world = _reciprocal_world(app)
    make_pending_exchange(
        app,
        world["a_booking"]["booking_id"],
        world["b_booking"]["booking_id"],
    )
    headers = login_headers(client, "a@example.test")
    response = client.post(
        "/api/matching/search",
        headers=headers,
        json={"booking_id": world["a_booking"]["booking_id"]},
    )
    assert response.status_code == 200
    assert response.get_json()["items"] == []
    assert response.get_json()["meta"]["requester_has_active_exchange"] is True

    c_headers = login_headers(client, "c@example.test")
    c_response = client.post(
        "/api/matching/search",
        headers=c_headers,
        json={"booking_id": world["c_booking"]["booking_id"]},
    )
    assert c_response.status_code == 200
    candidate_ids = [
        item["candidate_booking_id"] for item in c_response.get_json()["items"]
    ]
    assert world["a_booking"]["booking_id"] not in candidate_ids
    assert world["b_booking"]["booking_id"] not in candidate_ids


def test_preference_is_required_for_search(client, app):
    user_id = make_user(app, "nopref@example.test")
    journey = make_journey(app, train_number="99103")
    booking = make_booking(app, user_id, journey, "S1", 1)
    headers = login_headers(client, "nopref@example.test")
    response = client.post(
        "/api/matching/search",
        headers=headers,
        json={"booking_id": booking["booking_id"]},
    )
    assert response.status_code == 400
    assert response.get_json()["error"]["code"] == "PREFERENCE_REQUIRED"


def test_search_requires_authentication(client, app):
    world = _reciprocal_world(app)
    response = client.post(
        "/api/matching/search",
        json={"booking_id": world["a_booking"]["booking_id"]},
    )
    assert response.status_code == 401
