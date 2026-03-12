"""User Store Module."""

from topix.datatypes.user import User
from topix.store.postgres.pool import create_pool
from topix.store.postgres.user import (
    _dangerous_hard_delete_user_by_uid,
    create_user,
    delete_user_by_uid,
    get_user_by_email,
    get_user_by_google_sub,
    get_user_by_uid,
    link_google_account_by_uid,
    mark_user_email_verified_by_uid,
    update_user_by_uid,
)


class UserStore:
    """Store for managing user data in the database."""

    def __init__(self):
        """Initialize the UserStore."""
        self._pg_pool = None

    async def open(self):
        """Open the database connection pool."""
        self._pg_pool = await create_pool()

    async def add_user(self, user: User):
        """Add a new user to the database."""
        async with self._pg_pool.acquire() as conn:
            await create_user(conn, user)

    async def get_user(self, user_uid: str) -> User | None:
        """Retrieve a user by their UID."""
        async with self._pg_pool.acquire() as conn:
            return await get_user_by_uid(conn, user_uid)

    async def get_user_by_email(self, email: str) -> User | None:
        """Retrieve a user by their email."""
        async with self._pg_pool.acquire() as conn:
            return await get_user_by_email(conn, email)


    async def get_user_by_google_sub(self, google_sub: str) -> User | None:
        """Retrieve a user by their linked Google subject identifier."""
        async with self._pg_pool.acquire() as conn:
            return await get_user_by_google_sub(conn, google_sub)


    async def update_user(self, user_uid: str, data: dict):
        """Update a user's information."""
        async with self._pg_pool.acquire() as conn:
            await update_user_by_uid(conn, user_uid, data)


    async def link_google_account(
        self,
        user_uid: str,
        google_sub: str,
        google_email: str,
        google_picture_url: str | None,
    ):
        """Link a Google identity to an existing user account."""
        async with self._pg_pool.acquire() as conn:
            await link_google_account_by_uid(
                conn,
                user_uid,
                google_sub,
                google_email,
                google_picture_url,
            )

    async def delete_user(self, user_uid: str, hard_delete: bool = False):
        """Delete a user by their UID."""
        async with self._pg_pool.acquire() as conn:
            if hard_delete:
                await _dangerous_hard_delete_user_by_uid(conn, user_uid)
            else:
                await delete_user_by_uid(conn, user_uid)

    async def mark_user_email_verified(self, user_uid: str):
        """Mark a user email as verified."""
        async with self._pg_pool.acquire() as conn:
            await mark_user_email_verified_by_uid(conn, user_uid)

    async def close(self):
        """Close the database connection pool."""
        if self._pg_pool:
            await self._pg_pool.close()
