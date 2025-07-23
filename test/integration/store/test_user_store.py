"""Test cases for the UserStore class."""
import uuid

import pytest

from topix.datatypes.user import User
from topix.store.user import UserStore


def make_test_user():
    """Create a random user for testing."""
    return User(
        email=f"test_{uuid.uuid4().hex[:8]}@example.com",
        username=f"user_{uuid.uuid4().hex[:8]}",
        name="Test User"
    )


@pytest.mark.asyncio
async def test_add_get_update_delete_user(config):
    """Test adding, getting, updating, and deleting a user in UserStore."""
    user_store = UserStore()
    await user_store.open()
    try:
        # 1. Add user
        user = make_test_user()
        await user_store.add_user(user)

        # 2. Get user
        fetched = await user_store.get_user(user.uid)
        assert fetched is not None
        assert fetched.email == user.email
        assert fetched.username == user.username
        assert fetched.name == user.name

        # 3. Update user
        new_name = "Updated Name"
        await user_store.update_user(user.uid, {"name": new_name})
        updated = await user_store.get_user(user.uid)
        assert updated.name == new_name

        # 4. Delete user
        await user_store.delete_user(user.uid)
        deleted = await user_store.get_user(user.uid)
        assert deleted and deleted.deleted_at is not None

        # 5. Hard delete user
        await user_store.delete_user(user.uid, hard_delete=True)
        hard_deleted = await user_store.get_user(user.uid)
        assert hard_deleted is None
    finally:
        await user_store.close()
