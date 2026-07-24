"""The production rate limiter.

conftest disables the limiter for the rest of the suite (every test drives
requests from one client address, so it would cause order-dependent failures).
These tests re-enable it explicitly so its behaviour is still covered.
"""
import pytest

import main


@pytest.fixture
def limiter_on():
    """Enable the limiter and start from a clean bucket."""
    original = main.RATE_LIMIT_ENABLED
    main.RATE_LIMIT_ENABLED = True
    main._hits.clear()
    try:
        yield
    finally:
        main.RATE_LIMIT_ENABLED = original
        main._hits.clear()


def test_repeated_failed_logins_are_throttled(client, admin, limiter_on):
    """Credential stuffing against /auth/login is capped at 10 per 5 minutes."""
    limit = main.RATE_LIMITS["/api/v1/auth/login"][0]
    body = {"email": admin.email, "password": "definitely-wrong"}

    # The first `limit` attempts are rejected on credentials, not rate.
    for i in range(limit):
        r = client.post("/api/v1/auth/login", json=body)
        assert r.status_code == 401, f"attempt {i + 1} returned {r.status_code}"

    # The next one is throttled, and tells the caller when to retry.
    blocked = client.post("/api/v1/auth/login", json=body)
    assert blocked.status_code == 429
    assert "Retry-After" in blocked.headers
    assert int(blocked.headers["Retry-After"]) > 0


def test_limit_is_per_client_address(client, admin, limiter_on):
    """One caller exhausting its budget must not lock everyone else out."""
    limit = main.RATE_LIMITS["/api/v1/auth/login"][0]
    body = {"email": admin.email, "password": "definitely-wrong"}
    noisy = {"X-Forwarded-For": "203.0.113.10"}

    for _ in range(limit):
        client.post("/api/v1/auth/login", json=body, headers=noisy)
    assert client.post("/api/v1/auth/login", json=body, headers=noisy).status_code == 429

    # A different address still gets a normal credential rejection.
    other = client.post("/api/v1/auth/login", json=body, headers={"X-Forwarded-For": "203.0.113.99"})
    assert other.status_code == 401


def test_health_endpoint_is_not_throttled_away(client, limiter_on):
    """The platform polls /health continuously; it uses the generous default."""
    for _ in range(30):
        assert client.get("/health").status_code == 200


def test_security_headers_present(client):
    """Baseline hardening headers are applied to every response."""
    r = client.get("/health")
    assert r.headers["X-Content-Type-Options"] == "nosniff"
    assert r.headers["X-Frame-Options"] == "DENY"
    assert r.headers["Referrer-Policy"] == "no-referrer"


def test_readiness_reports_dependency_checks(client):
    """/ready names what it verified rather than asserting a bare 'ok'."""
    r = client.get("/ready")
    assert r.status_code in (200, 503)
    checks = r.json()["checks"]
    assert set(checks) == {"database", "models"}
    # The test database is real and reachable, so that check must pass.
    assert checks["database"] is True
    # No filesystem path, version, or config value may leak from this endpoint.
    for leak in ("Saved_Models", "sqlite", "postgres", "JWT", "password", "uploads"):
        assert leak.lower() not in r.text.lower()
