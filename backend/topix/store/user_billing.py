"""User billing store module."""

from topix.datatypes.user_billing import UserBilling
from topix.store.postgres.pool import create_pool
from topix.store.postgres.user_billing import (
    create_user_billing,
    delete_user_billing_by_uid,
    get_user_billing_by_uid,
    update_user_billing_by_uid,
    upsert_user_billing_by_uid,
)


class UserBillingStore:
    """Store for managing user billing in the database."""

    def __init__(self):
        """Initialize the UserBillingStore."""
        self._pg_pool = None

    async def open(self):
        """Open the database connection pool."""
        self._pg_pool = await create_pool()

    async def add_user_billing(self, billing: UserBilling):
        """Add a new user billing record."""
        async with self._pg_pool.acquire() as conn:
            await create_user_billing(conn, billing)

    async def get_user_billing(self, user_uid: str) -> UserBilling | None:
        """Retrieve user billing by user UID."""
        async with self._pg_pool.acquire() as conn:
            return await get_user_billing_by_uid(conn, user_uid)

    async def update_user_billing(self, user_uid: str, data: dict):
        """Update user billing by user UID."""
        async with self._pg_pool.acquire() as conn:
            await update_user_billing_by_uid(conn, user_uid, data)

    async def upsert_user_billing(self, user_uid: str, data: dict):
        """Upsert user billing by user UID."""
        async with self._pg_pool.acquire() as conn:
            await upsert_user_billing_by_uid(conn, user_uid, data)

    async def delete_user_billing(self, user_uid: str):
        """Delete user billing by user UID."""
        async with self._pg_pool.acquire() as conn:
            await delete_user_billing_by_uid(conn, user_uid)

    async def close(self):
        """Close the database connection pool."""
        if self._pg_pool:
            await self._pg_pool.close()
