"""Unit tests for the user data model."""

from datetime import datetime

from topix.datatypes.user import User


def test_user_defaults_match_local_auth_account_shape():
    """User should default to a local account with generated identity fields."""
    user = User(
        email="user@example.com",
        username="user",
    )

    assert user.type == "user"
    assert user.auth_provider == "local"
    assert user.password_hash is None
    assert user.google_sub is None
    assert user.google_email is None
    assert user.google_picture_url is None
    assert user.google_linked_at is None
    assert user.email_verified_at is None
    assert isinstance(user.uid, str)
    assert len(user.uid) == 32
    assert isinstance(user.created_at, datetime)


def test_user_accepts_google_identity_fields():
    """User should retain Google-specific identity and linking metadata."""
    linked_at = datetime(2026, 3, 12, 10, 30, 0)
    verified_at = datetime(2026, 3, 12, 10, 31, 0)
    user = User(
        email="user@example.com",
        username="user",
        auth_provider="local_google",
        google_sub="google-sub-123",
        google_email="user@example.com",
        google_picture_url="https://example.com/avatar.png",
        google_linked_at=linked_at,
        email_verified_at=verified_at,
    )

    assert user.auth_provider == "local_google"
    assert user.google_sub == "google-sub-123"
    assert user.google_email == "user@example.com"
    assert user.google_picture_url == "https://example.com/avatar.png"
    assert user.google_linked_at == linked_at
    assert user.email_verified_at == verified_at
