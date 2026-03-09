"""Email verification store module."""

from topix.datatypes.email_verification import EmailVerificationToken
from topix.store.postgres.email_verification import (
    _dangerous_hard_delete_email_verification_tokens_by_user_uid,
    get_active_email_verification_token_by_hash,
    get_latest_email_verification_token_by_user_uid,
    mark_email_verification_token_used_by_uid,
    upsert_email_verification_token,
)
from topix.store.postgres.pool import create_pool


class EmailVerificationStore:
    """Store for managing email verification tokens."""

    def __init__(self):
        """Initialize the email verification store."""
        self._pg_pool = None

    async def open(self):
        """Open the database connection pool."""
        self._pg_pool = await create_pool()

    async def save_token(self, token: EmailVerificationToken) -> EmailVerificationToken:
        """Create/replace active verification token for a user."""
        async with self._pg_pool.acquire() as conn:
            return await upsert_email_verification_token(conn, token)

    async def get_active_token_by_hash(self, token_hash: str) -> EmailVerificationToken | None:
        """Fetch an active verification token by hash."""
        async with self._pg_pool.acquire() as conn:
            return await get_active_email_verification_token_by_hash(conn, token_hash)

    async def mark_token_used(self, token_uid: str) -> None:
        """Mark a verification token as used."""
        async with self._pg_pool.acquire() as conn:
            await mark_email_verification_token_used_by_uid(conn, token_uid)

    async def get_latest_token_for_user(self, user_uid: str) -> EmailVerificationToken | None:
        """Fetch latest verification token for a user."""
        async with self._pg_pool.acquire() as conn:
            return await get_latest_email_verification_token_by_user_uid(conn, user_uid)

    async def _dangerous_hard_delete_tokens_for_user(self, user_uid: str) -> None:
        """Hard delete all tokens for a user (tests only)."""
        async with self._pg_pool.acquire() as conn:
            await _dangerous_hard_delete_email_verification_tokens_by_user_uid(conn, user_uid)

    async def close(self):
        """Close the database connection pool."""
        if self._pg_pool:
            await self._pg_pool.close()
