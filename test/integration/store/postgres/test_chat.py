"""Integration tests for the chat store."""
from datetime import datetime

import pytest
import pytest_asyncio

from topix.datatypes.chat.chat import Chat
from topix.datatypes.user import User
from topix.store.postgres.chat import (
    _dangerous_hard_delete_chat_by_uid,
    create_chat,
    delete_chat_by_uid,
    get_chat_by_uid,
    update_chat_by_uid,
)
from topix.store.postgres.user import _dangerous_hard_delete_user_by_uid, create_user
from topix.utils.common import gen_uid


@pytest_asyncio.fixture
async def chat_uid():
    """Fixture to generate a unique chat UID for testing."""
    return gen_uid()


@pytest.mark.asyncio
async def test_chat_crud(conn, chat_uid):
    """Test the CRUD operations for the Chat model in the Postgres store."""
    # Assumes a user with this uid exists, or create a test user first.
    user_uid = gen_uid()  # In real tests, ensure the user exists!

    user = User(
        uid=user_uid,
        email=f"{user_uid}@gmail.com",
        username=user_uid
    )

    await create_user(conn, user)

    chat = Chat(
        uid=chat_uid,
        label="Initial Chat",
        user_uid=user_uid,
        created_at=datetime.now().isoformat(),
    )

    # CREATE
    created_chat = await create_chat(conn, chat)
    assert created_chat.id is not None
    assert created_chat.uid == chat_uid
    assert created_chat.label == "Initial Chat"

    # GET
    loaded = await get_chat_by_uid(conn, chat_uid)
    assert loaded is not None
    assert loaded.uid == chat_uid
    assert loaded.label == "Initial Chat"
    assert loaded.user_uid == user_uid

    # UPDATE
    new_label = "Updated Chat"
    await update_chat_by_uid(conn, chat_uid, {"label": new_label})
    updated = await get_chat_by_uid(conn, chat_uid)
    assert updated is not None
    assert updated.label == new_label

    # DELETE
    await delete_chat_by_uid(conn, chat_uid)
    gone = await get_chat_by_uid(conn, chat_uid)
    assert gone is not None
    assert gone.deleted_at is not None

    await _dangerous_hard_delete_chat_by_uid(conn, chat_uid)

    # Verify hard delete
    gone = await get_chat_by_uid(conn, chat_uid)
    assert gone is None

    await _dangerous_hard_delete_user_by_uid(conn, user_uid)
