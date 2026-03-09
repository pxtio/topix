"""Unit tests for users email verification endpoints."""

from datetime import timedelta

from fastapi import FastAPI
from fastapi.testclient import TestClient

from topix.api.router.users import router
from topix.api.utils.email_verification import hash_email_verification_token, utc_now
from topix.api.utils.security import get_current_user_uid
from topix.datatypes.email_verification import EmailVerificationToken
from topix.datatypes.user import User


class _FakeUserStore:
    """Minimal user store stub for users router tests."""

    def __init__(self):
        self._users_by_uid: dict[str, User] = {}
        self.marked_verified: list[str] = []

    async def add_user(self, user: User):
        self._users_by_uid[user.uid] = user

    async def get_user(self, user_uid: str) -> User | None:
        return self._users_by_uid.get(user_uid)

    async def mark_user_email_verified(self, user_uid: str):
        self.marked_verified.append(user_uid)
        user = self._users_by_uid.get(user_uid)
        if user:
            user.email_verified_at = utc_now()

    async def delete_user(self, user_uid: str, hard_delete: bool = False):
        self._users_by_uid.pop(user_uid, None)


class _FakeEmailVerificationStore:
    """Minimal email verification store stub for router tests."""

    def __init__(self):
        self._active_by_hash: dict[str, EmailVerificationToken] = {}
        self._latest_by_user: dict[str, EmailVerificationToken] = {}
        self.saved: list[EmailVerificationToken] = []
        self.used: list[str] = []

    async def save_token(self, token: EmailVerificationToken):
        self.saved.append(token)
        self._active_by_hash[token.token_hash] = token
        self._latest_by_user[token.user_uid] = token
        return token

    async def get_active_token_by_hash(self, token_hash: str) -> EmailVerificationToken | None:
        return self._active_by_hash.get(token_hash)

    async def mark_token_used(self, token_uid: str):
        self.used.append(token_uid)

    async def get_latest_token_for_user(self, user_uid: str) -> EmailVerificationToken | None:
        return self._latest_by_user.get(user_uid)


class _FakeUserBillingStore:
    """Minimal billing store stub used by token plan resolver."""

    async def get_user_billing(self, user_uid: str):
        return None


def _build_client(
    *,
    user_uid: str = "user-1",
    user_store: _FakeUserStore | None = None,
    email_store: _FakeEmailVerificationStore | None = None,
) -> tuple[TestClient, _FakeUserStore, _FakeEmailVerificationStore]:
    app = FastAPI()
    app.include_router(router)
    app.user_store = user_store or _FakeUserStore()
    app.email_verification_store = email_store or _FakeEmailVerificationStore()
    app.user_billing_store = _FakeUserBillingStore()

    async def _fake_current_user_uid():
        return user_uid

    app.dependency_overrides[get_current_user_uid] = _fake_current_user_uid
    return TestClient(app), app.user_store, app.email_verification_store


def test_verify_email_disabled_returns_success(monkeypatch):
    """Verify endpoint should no-op with success when feature is disabled."""
    monkeypatch.delenv("EMAIL_VERIFICATION_ENABLED", raising=False)
    client, _, _ = _build_client()

    response = client.post("/users/verify-email", json={"token": "abc"})

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "success"
    assert payload["data"]["message"] == "Email verification is disabled"


def test_verify_email_marks_user_and_token_used(monkeypatch):
    """Verify endpoint should mark user verified and consume token."""
    monkeypatch.setenv("EMAIL_VERIFICATION_ENABLED", "true")
    client, user_store, email_store = _build_client(user_uid="u-1")
    user_store._users_by_uid["u-1"] = User(
        uid="u-1",
        email="u1@test.com",
        username="u-1",
        password_hash="hash",
    )
    raw_token = "valid-token"
    hashed = hash_email_verification_token(raw_token)
    email_store._active_by_hash[hashed] = EmailVerificationToken(
        uid="evt-1",
        user_uid="u-1",
        token_hash=hashed,
        expires_at=utc_now() + timedelta(hours=1),
    )

    response = client.post("/users/verify-email", json={"token": raw_token})

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "success"
    assert payload["data"]["message"] == "Email verified successfully"
    assert user_store.marked_verified == ["u-1"]
    assert email_store.used == ["evt-1"]


def test_verify_email_invalid_token(monkeypatch):
    """Verify endpoint should return 400 error payload for invalid token."""
    monkeypatch.setenv("EMAIL_VERIFICATION_ENABLED", "true")
    client, _, _ = _build_client()

    response = client.post("/users/verify-email", json={"token": "invalid"})

    assert response.status_code == 400
    payload = response.json()
    assert payload["status"] == "error"
    assert payload["data"]["message"] == "Invalid or expired verification token"


def test_resend_verification_cooldown(monkeypatch):
    """Resend endpoint should return 429 when called before cooldown expires."""
    monkeypatch.setenv("EMAIL_VERIFICATION_ENABLED", "true")
    monkeypatch.setenv("RESEND_API_KEY", "test-key")
    monkeypatch.setenv("RESEND_FROM_EMAIL", "noreply@test.com")
    monkeypatch.setenv("APP_BASE_URL", "http://localhost:3175")

    client, user_store, email_store = _build_client(user_uid="u-2")
    user_store._users_by_uid["u-2"] = User(
        uid="u-2",
        email="u2@test.com",
        username="u-2",
        password_hash="hash",
    )
    email_store._latest_by_user["u-2"] = EmailVerificationToken(
        uid="evt-recent",
        user_uid="u-2",
        token_hash=hash_email_verification_token("recent"),
        expires_at=utc_now() + timedelta(hours=1),
        created_at=utc_now(),
    )

    response = client.post("/users/resend-verification")

    assert response.status_code == 429
    payload = response.json()
    assert payload["status"] == "error"
    assert payload["data"]["message"] == "Please wait before requesting another verification email"


def test_signup_enabled_creates_verification_token(monkeypatch):
    """Signup should create verification token row when feature is enabled."""
    monkeypatch.setenv("EMAIL_VERIFICATION_ENABLED", "true")
    monkeypatch.setenv("RESEND_API_KEY", "test-key")
    monkeypatch.setenv("RESEND_FROM_EMAIL", "noreply@test.com")
    monkeypatch.setenv("APP_BASE_URL", "http://localhost:3175")
    monkeypatch.delenv("VITE_BILLING_ENABLED", raising=False)

    sent_payloads: list[dict] = []

    async def _fake_send_email_verification_link(**kwargs):
        sent_payloads.append(kwargs)

    monkeypatch.setattr(
        "topix.api.router.users.send_email_verification_link",
        _fake_send_email_verification_link,
    )

    client, _, email_store = _build_client(user_uid="u-3")
    response = client.post(
        "/users/signup",
        json={
            "email": "signup@test.com",
            "password": "x",
            "name": "Signup User",
            "username": "signup-user",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "success"
    assert payload["data"]["token"]["access_token"]
    assert len(email_store.saved) == 1
    assert len(sent_payloads) == 1
