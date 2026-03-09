"""Integration tests for email verification postgres store."""

from datetime import timedelta

import asyncpg
import pytest

from topix.api.utils.email_verification import hash_email_verification_token, utc_now
from topix.datatypes.email_verification import EmailVerificationToken
from topix.store.postgres.email_verification import (
    _dangerous_hard_delete_email_verification_tokens_by_user_uid,
    get_active_email_verification_token_by_hash,
    get_latest_email_verification_token_by_user_uid,
    mark_email_verification_token_used_by_uid,
    upsert_email_verification_token,
)
from topix.utils.common import gen_uid


@pytest.mark.asyncio
async def test_email_verification_token_lifecycle(conn: asyncpg.Connection):
    """Should create, resolve, consume and replace verification tokens correctly."""
    user_uid = gen_uid()
    user_email = f"{user_uid}@test.com"

    await conn.execute(
        "INSERT INTO users (uid, email, username, name, password_hash) VALUES ($1, $2, $3, $4, $5)",
        user_uid,
        user_email,
        user_uid,
        "Test User",
        "hashed_password",
    )

    now = utc_now()
    token_1_raw = "token-one"
    token_1 = EmailVerificationToken(
        user_uid=user_uid,
        token_hash=hash_email_verification_token(token_1_raw),
        expires_at=now + timedelta(hours=24),
        created_at=now,
    )
    saved_token_1 = await upsert_email_verification_token(conn, token_1)
    assert saved_token_1.id is not None

    active = await get_active_email_verification_token_by_hash(conn, token_1.token_hash)
    assert active is not None
    assert active.user_uid == user_uid

    await mark_email_verification_token_used_by_uid(conn, saved_token_1.uid)
    consumed = await get_active_email_verification_token_by_hash(conn, token_1.token_hash)
    assert consumed is None

    token_2 = EmailVerificationToken(
        user_uid=user_uid,
        token_hash=hash_email_verification_token("token-two"),
        expires_at=now + timedelta(hours=24),
    )
    await upsert_email_verification_token(conn, token_2)
    latest = await get_latest_email_verification_token_by_user_uid(conn, user_uid)
    assert latest is not None
    assert latest.token_hash == token_2.token_hash

    await _dangerous_hard_delete_email_verification_tokens_by_user_uid(conn, user_uid)
    await conn.execute("DELETE FROM users WHERE uid = $1", user_uid)
