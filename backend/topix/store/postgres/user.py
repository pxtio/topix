"""User Base Postgres Store."""
from datetime import datetime

import asyncpg

from topix.datatypes.user import User


async def create_user(conn: asyncpg.Connection, user: User) -> User:
    """Create a new user in the database."""
    query = (
        "INSERT INTO users (uid, email, username, name, created_at, password_hash) "
        "VALUES ($1, $2, $3, $4, $5, $6) RETURNING id"
    )
    try:
        user_id = await conn.fetchval(
            query,
            user.uid, user.email, user.username, user.name,
            user.created_at,
            user.password_hash
        )
        user.id = user_id
        return user
    except asyncpg.exceptions.UniqueViolationError as e:
        msg = str(e)
        if "uid" in msg:
            raise ValueError("UID already exists")
        elif "email" in msg:
            raise ValueError("Email already exists")
        elif "username" in msg:
            raise ValueError("Username already exists")
        else:
            raise ValueError("User already exists")


async def get_user_by_uid(conn: asyncpg.Connection, uid: str) -> User | None:
    """Fetch a user by their unique identifier (UID)."""
    query = (
        "SELECT id, uid, email, username, name, created_at, "
        "updated_at, deleted_at "
        "FROM users WHERE uid = $1"
    )
    row = await conn.fetchrow(query, uid)
    if not row:
        return None
    return User(
        id=row['id'],
        uid=row['uid'],
        email=row['email'],
        username=row['username'],
        name=row['name'],
        created_at=row['created_at'].isoformat() if row['created_at'] else None,
        updated_at=row['updated_at'].isoformat() if row['updated_at'] else None,
        deleted_at=row['deleted_at'].isoformat() if row['deleted_at'] else None
    )


async def get_user_by_email(conn: asyncpg.Connection, email: str) -> User | None:
    """Fetch a user by their email."""
    query = (
        "SELECT id, uid, email, username, name, created_at, "
        "updated_at, deleted_at, password_hash "
        "FROM users WHERE email = $1"
    )
    row = await conn.fetchrow(query, email)
    if not row:
        return None
    return User(
        id=row['id'],
        uid=row['uid'],
        email=row['email'],
        username=row['username'],
        name=row['name'],
        created_at=row['created_at'].isoformat() if row['created_at'] else None,
        updated_at=row['updated_at'].isoformat() if row['updated_at'] else None,
        deleted_at=row['deleted_at'].isoformat() if row['deleted_at'] else None,
        password_hash=row['password_hash'] if row['password_hash'] else None
    )


async def update_user_by_uid(conn: asyncpg.Connection, uid: str, updated_data: dict):
    """Update user information by UID."""
    # Exclude any date fields from being updated manually
    forbidden_fields = {"created_at", "updated_at", "deleted_at"}
    data = {k: v for k, v in updated_data.items() if k not in forbidden_fields}
    if not data:
        return

    # Build dynamic query with positional parameters
    set_clauses = [f"{k} = ${i+1}" for i, k in enumerate(data.keys())]
    set_clause = ', '.join(set_clauses)
    values = list(data.values())

    # Always set updated_at to now
    set_clause += f", updated_at = ${len(values) + 1}"
    values.append(datetime.now())

    # Add uid as the last parameter
    values.append(uid)
    query = f"UPDATE users SET {set_clause} WHERE uid = ${len(values)}"

    try:
        await conn.execute(query, *values)
    except asyncpg.exceptions.UniqueViolationError as e:
        msg = str(e)
        if "uid" in msg:
            raise ValueError("UID already exists")
        elif "email" in msg:
            raise ValueError("Email already exists")
        elif "username" in msg:
            raise ValueError("Username already exists")
        else:
            raise ValueError("User update conflicts with unique constraint")


async def delete_user_by_uid(conn: asyncpg.Connection, uid: str):
    """Soft delete a user by setting deleted_at to now."""
    query = "UPDATE users SET deleted_at = NOW() WHERE uid = $1"
    await conn.execute(query, uid)


async def get_user_id_by_uid(conn: asyncpg.Connection, user_uid: str) -> int | None:
    """Fetch user integer ID from their UID."""
    query = "SELECT id FROM users WHERE uid = $1"
    return await conn.fetchval(query, user_uid)


async def _dangerous_hard_delete_user_by_uid(
    conn: asyncpg.Connection,
    uid: str
) -> None:
    """Hard delete a user by UID (use with caution!)."""
    query = "DELETE FROM users WHERE uid = $1"
    await conn.execute(query, uid)
