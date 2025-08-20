"""User Base Postgres Store."""
from datetime import datetime

from psycopg import AsyncConnection
from psycopg.errors import UniqueViolation

from src.datatypes.user import User


async def create_user(conn: AsyncConnection, user: User) -> User:
    """Create a new user in the database."""
    query = (
        "INSERT INTO users (uid, email, username, name, created_at) "
        "VALUES (%s, %s, %s, %s, %s) RETURNING id"
    )
    try:
        async with conn.cursor() as cur:
            await cur.execute(
                query,
                (user.uid, user.email, user.username, user.name, user.created_at)
            )
            row = await cur.fetchone()
            user.id = row[0]

        await conn.commit()
        return user
    except UniqueViolation as e:
        msg = str(e)
        if "uid" in msg:
            raise ValueError("UID already exists")
        elif "email" in msg:
            raise ValueError("Email already exists")
        elif "username" in msg:
            raise ValueError("Username already exists")
        else:
            raise ValueError("User already exists")


async def get_user_by_uid(conn: AsyncConnection, uid: str) -> User | None:
    """Fetch a user by their unique identifier (UID)."""
    query = (
        "SELECT id, uid, email, username, name, created_at, "
        "updated_at, deleted_at "
        "FROM users WHERE uid = %s"
    )
    async with conn.cursor() as cur:
        await cur.execute(query, (uid,))
        row = await cur.fetchone()
        if not row:
            return None
        return User(
            id=row[0],
            uid=row[1],
            email=row[2],
            username=row[3],
            name=row[4],
            created_at=row[5].isoformat() if row[5] else None,
            updated_at=row[6].isoformat() if row[6] else None,
            deleted_at=row[7].isoformat() if row[7] else None
        )


async def update_user_by_uid(conn: AsyncConnection, uid: str, updated_data: dict):
    """Update user information by UID."""
    # Exclude any date fields from being updated manually
    forbidden_fields = {"created_at", "updated_at", "deleted_at"}
    data = {k: v for k, v in updated_data.items() if k not in forbidden_fields}
    if not data:
        return

    set_clause = ', '.join(f"{k} = %s" for k in data)
    values = list(data.values())

    # Always set updated_at to now
    set_clause += ", updated_at = %s"
    values.append(datetime.now())

    values.append(uid)
    query = f"UPDATE users SET {set_clause} WHERE uid = %s"
    try:
        async with conn.cursor() as cur:
            await cur.execute(query, tuple(values))
        await conn.commit()
    except UniqueViolation as e:
        msg = str(e)
        if "uid" in msg:
            raise ValueError("UID already exists")
        elif "email" in msg:
            raise ValueError("Email already exists")
        elif "username" in msg:
            raise ValueError("Username already exists")
        else:
            raise ValueError("User update conflicts with unique constraint")


async def delete_user_by_uid(conn: AsyncConnection, uid: str):
    """Soft delete a user by setting deleted_at to now."""
    query = "UPDATE users SET deleted_at = NOW() WHERE uid = %s"
    async with conn.cursor() as cur:
        await cur.execute(query, (uid,))
    await conn.commit()


async def get_user_id_by_uid(conn: AsyncConnection, user_uid: str) -> int | None:
    """Fetch user integer ID from their UID."""
    query = "SELECT id FROM users WHERE uid = %s"
    async with conn.cursor() as cur:
        await cur.execute(query, (user_uid,))
        row = await cur.fetchone()
        return row[0] if row else None


async def _dangerous_hard_delete_user_by_uid(
    conn: AsyncConnection,
    uid: str
) -> None:
    """Hard delete a user by UID (use with caution!)."""
    query = "DELETE FROM users WHERE uid = %s"
    async with conn.cursor() as cur:
        await cur.execute(query, (uid,))
    await conn.commit()
