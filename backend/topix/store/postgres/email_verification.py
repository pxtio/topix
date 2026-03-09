"""Email verification Postgres store."""


import asyncpg

from topix.datatypes.email_verification import EmailVerificationToken


async def upsert_email_verification_token(
    conn: asyncpg.Connection,
    token: EmailVerificationToken,
) -> EmailVerificationToken:
    """Create a new active token after invalidating prior active tokens."""
    await conn.execute(
        "DELETE FROM email_verification_tokens WHERE user_uid = $1 AND used_at IS NULL",
        token.user_uid,
    )
    row = await conn.fetchrow(
        "INSERT INTO email_verification_tokens ("
        "uid, user_uid, token_hash, expires_at, used_at, created_at, updated_at"
        ") VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id",
        token.uid,
        token.user_uid,
        token.token_hash,
        token.expires_at,
        token.used_at,
        token.created_at,
        token.updated_at,
    )
    token.id = row["id"] if row else None
    return token


async def get_active_email_verification_token_by_hash(
    conn: asyncpg.Connection,
    token_hash: str,
) -> EmailVerificationToken | None:
    """Fetch active token by hash (unused + non-expired)."""
    row = await conn.fetchrow(
        "SELECT id, uid, user_uid, token_hash, expires_at, used_at, created_at, updated_at "
        "FROM email_verification_tokens "
        "WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW()",
        token_hash,
    )
    if not row:
        return None
    return EmailVerificationToken(
        id=row["id"],
        uid=row["uid"],
        user_uid=row["user_uid"],
        token_hash=row["token_hash"],
        expires_at=row["expires_at"].isoformat() if row["expires_at"] else None,
        used_at=row["used_at"].isoformat() if row["used_at"] else None,
        created_at=row["created_at"].isoformat() if row["created_at"] else None,
        updated_at=row["updated_at"].isoformat() if row["updated_at"] else None,
    )


async def mark_email_verification_token_used_by_uid(
    conn: asyncpg.Connection,
    token_uid: str,
) -> None:
    """Mark token as used if not already consumed."""
    await conn.execute(
        "UPDATE email_verification_tokens "
        "SET used_at = COALESCE(used_at, NOW()), updated_at = NOW() "
        "WHERE uid = $1",
        token_uid,
    )


async def get_latest_email_verification_token_by_user_uid(
    conn: asyncpg.Connection,
    user_uid: str,
) -> EmailVerificationToken | None:
    """Return latest token (active or used) for resend cooldown decisions."""
    row = await conn.fetchrow(
        "SELECT id, uid, user_uid, token_hash, expires_at, used_at, created_at, updated_at "
        "FROM email_verification_tokens "
        "WHERE user_uid = $1 ORDER BY created_at DESC LIMIT 1",
        user_uid,
    )
    if not row:
        return None
    return EmailVerificationToken(
        id=row["id"],
        uid=row["uid"],
        user_uid=row["user_uid"],
        token_hash=row["token_hash"],
        expires_at=row["expires_at"].isoformat() if row["expires_at"] else None,
        used_at=row["used_at"].isoformat() if row["used_at"] else None,
        created_at=row["created_at"].isoformat() if row["created_at"] else None,
        updated_at=row["updated_at"].isoformat() if row["updated_at"] else None,
    )


async def _dangerous_hard_delete_email_verification_tokens_by_user_uid(
    conn: asyncpg.Connection,
    user_uid: str,
) -> None:
    """Hard delete all email verification tokens for a user."""
    await conn.execute(
        "DELETE FROM email_verification_tokens WHERE user_uid = $1",
        user_uid,
    )
