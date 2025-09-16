"""User Store Module."""

from topix.datatypes.user import User
from topix.store.postgres.pool import create_pool
from topix.store.postgres.user import (
    _dangerous_hard_delete_user_by_uid,
    create_user,
    delete_user_by_uid,
    get_user_by_email,
    get_user_by_uid,
    update_user_by_uid
)


class UserStore:
    """Store for managing user data in the database."""

    def __init__(self):
        """Initialize the UserStore."""
        self._pg_pool = create_pool()

    async def open(self):
        """Open the database connection pool."""
        await self._pg_pool.open()

    async def add_user(self, user: User):
        """Add a new user to the database."""
        async with self._pg_pool.connection() as conn:
            await create_user(conn, user)

    async def get_user(self, user_uid: str) -> User | None:
        """Retrieve a user by their UID."""
        async with self._pg_pool.connection() as conn:
            return await get_user_by_uid(conn, user_uid)

    async def get_user_by_email(self, email: str) -> User | None:
        """Retrieve a user by their email."""
        async with self._pg_pool.connection() as conn:
            return await get_user_by_email(conn, email)

    async def update_user(self, user_uid: str, data: dict):
        """Update a user's information."""
        async with self._pg_pool.connection() as conn:
            await update_user_by_uid(conn, user_uid, data)

    async def delete_user(self, user_uid: str, hard_delete: bool = False):
        """Delete a user by their UID."""
        async with self._pg_pool.connection() as conn:
            if hard_delete:
                await _dangerous_hard_delete_user_by_uid(conn, user_uid)
            else:
                await delete_user_by_uid(conn, user_uid)

    async def close(self):
        """Close the database connection pool."""
        await self._pg_pool.close()
