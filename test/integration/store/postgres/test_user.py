from datetime import datetime

from psycopg import AsyncConnection
import pytest
import pytest_asyncio

from topix.datatypes.user import User
from topix.store.postgres.user import (
    _dangerous_hard_delete_user_by_uid,
    create_user,
    get_user_by_uid,
    get_user_id_by_uid,
    update_user_by_uid,
    delete_user_by_uid,
)
from topix.utils.common import gen_uid


@pytest_asyncio.fixture
async def user_uid():
    return gen_uid()


@pytest.mark.asyncio
async def test_user_crud(conn: AsyncConnection, user_uid: str):
    email = f"{user_uid}@test.com"
    now = datetime.now().isoformat()
    user = User(
        uid=user_uid,
        email=email,
        username=user_uid,
        name="Test User",
        creaated_at=now
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
