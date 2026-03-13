"""Integration tests for the user store."""
from datetime import datetime

import asyncpg
import pytest

from topix.datatypes.user import User
from topix.store.postgres.user import (
    _dangerous_hard_delete_user_by_uid,
    create_user,
    delete_user_by_uid,
    get_user_by_google_sub,
    get_user_by_uid,
    get_user_id_by_uid,
    link_google_account_by_uid,
    update_user_by_uid,
)
from topix.utils.common import gen_uid


@pytest.fixture
def user_uid():
    """Fixture to generate a unique user UID for testing."""
    return gen_uid()


@pytest.mark.asyncio
async def test_user_crud(conn: asyncpg.Connection, user_uid: str):
    """Test the CRUD operations for the User model in the Postgres store."""
    email = f"{user_uid}@test.com"
    now = datetime.now().isoformat()
    user = User(
        uid=user_uid,
        email=email,
        username=user_uid,
        name="Test User",
        created_at=now,
        password_hash="hashed_password"
    )

    # CREATE
    created_user = await create_user(conn, user)
    assert created_user.id is not None
    assert created_user.uid == user.uid
    assert created_user.email == email

    # GET
    loaded = await get_user_by_uid(conn, user.uid)
    assert loaded is not None
    assert loaded.uid == user.uid
    assert loaded.email == email
    assert loaded.name == "Test User"

    # GET ID
    user_id = await get_user_id_by_uid(conn, user.uid)
    assert user_id == created_user.id

    # UPDATE
    new_name = "Renamed User"
    new_username = f"{user_uid}_new"
    await update_user_by_uid(
        conn,
        user.uid,
        {"name": new_name, "username": new_username}
    )
    updated = await get_user_by_uid(conn, user.uid)
    assert updated is not None
    assert updated.name == new_name
    assert updated.username == new_username

    # DELETE
    await delete_user_by_uid(conn, user.uid)
    soft_deleted = await get_user_by_uid(conn, user.uid)
    assert soft_deleted is not None  # Soft-deleted: still present but deleted_at is set
    assert soft_deleted.deleted_at is not None

    # HARD DELETE
    await _dangerous_hard_delete_user_by_uid(conn, user.uid)
    gone = await get_user_by_uid(conn, user.uid)
    assert gone is None


@pytest.mark.asyncio
async def test_google_user_fields_round_trip(conn: asyncpg.Connection):
    """Should persist and reload Google-specific user identity fields."""
    user = User(
        email=f"{gen_uid()}@test.com",
        username=f"user_{gen_uid()[:8]}",
        name="Google User",
        auth_provider="google",
        google_sub="google-sub-1",
        google_email="google-user@test.com",
        google_picture_url="https://example.com/avatar.png",
        email_verified_at=datetime.now().isoformat(),
    )

    created_user = await create_user(conn, user)
    loaded = await get_user_by_google_sub(conn, "google-sub-1")

    assert created_user.id is not None
    assert loaded is not None
    assert loaded.uid == user.uid
    assert loaded.auth_provider == "google"
    assert loaded.google_sub == "google-sub-1"
    assert loaded.google_email == "google-user@test.com"
    assert loaded.google_picture_url == "https://example.com/avatar.png"
    assert loaded.password_hash is None

    await _dangerous_hard_delete_user_by_uid(conn, user.uid)


@pytest.mark.asyncio
async def test_link_google_account_upgrades_existing_local_user(conn: asyncpg.Connection):
    """Should link Google identity onto an existing local account."""
    user = User(
        email=f"{gen_uid()}@test.com",
        username=f"user_{gen_uid()[:8]}",
        name="Linked User",
        password_hash="hashed_password",
    )
    await create_user(conn, user)

    await link_google_account_by_uid(
        conn,
        user.uid,
        "google-sub-2",
        user.email,
        "https://example.com/linked.png",
    )
    loaded = await get_user_by_uid(conn, user.uid)

    assert loaded is not None
    assert loaded.auth_provider == "local_google"
    assert loaded.google_sub == "google-sub-2"
    assert loaded.google_email == user.email
    assert loaded.google_picture_url == "https://example.com/linked.png"
    assert loaded.google_linked_at is not None
    assert loaded.password_hash == "hashed_password"

    await _dangerous_hard_delete_user_by_uid(conn, user.uid)
