"""Chat management functions for PostgreSQL backend."""

from datetime import datetime

from psycopg import AsyncConnection

from topix.datatypes.chat.chat import Chat


async def create_chat(
    conn: AsyncConnection,
    chat: Chat
) -> Chat:
    """Insert a new chat using user_uid as FK and set its id after creation."""
    query = (
        "INSERT INTO chats (uid, label, user_uid, graph_uid, "
        "created_at, updated_at, deleted_at) "
        "VALUES (%s, %s, %s, %s, %s, %s, %s) "
        "RETURNING id"
    )
    async with conn.cursor() as cur:
        await cur.execute(
            query,
            (
                chat.uid,
                chat.label,
                chat.user_uid,
                chat.graph_uid,
                chat.created_at,
                chat.updated_at,
                chat.deleted_at,
            )
        )
        row = await cur.fetchone()
        chat.id = row[0]

    await conn.commit()
    return chat


async def get_chat_by_uid(
    conn: AsyncConnection,
    uid: str
) -> Chat | None:
    """Fetch a chat by its UID.

    Returns None if not found.
    """
    query = (
        "SELECT id, uid, label, user_uid, "
        "graph_uid, created_at, updated_at, deleted_at "
        "FROM chats WHERE uid = %s"
    )
    async with conn.cursor() as cur:
        await cur.execute(query, (uid,))
        row = await cur.fetchone()
        if not row:
            return None
        return Chat(
            id=row[0],
            uid=row[1],
            label=row[2],
            user_uid=row[3],
            graph_uid=row[4],
            created_at=row[5].isoformat() if row[5] else None,
            updated_at=row[6].isoformat() if row[6] else None,
            deleted_at=row[7].isoformat() if row[7] else None
        )


async def update_chat_by_uid(
    conn: AsyncConnection,
    uid: str,
    updated_data: dict
):
    """Update non-date chat fields by UID.

    Always updates updated_at to now.
    """
    # Exclude any date fields from being updated manually
    forbidden_fields = {"created_at", "updated_at", "deleted_at"}
    data = {k: v for k, v in updated_data.items() if k not in forbidden_fields}
    # Always set updated_at to now
    data['updated_at'] = datetime.now()
    set_clause = ', '.join(f"{k} = %s" for k in data)
    values = list(data.values())
    values.append(uid)
    query = f"UPDATE chats SET {set_clause} WHERE uid = %s"
    async with conn.cursor() as cur:
        await cur.execute(query, tuple(values))
    await conn.commit()


async def delete_chat_by_uid(
    conn: AsyncConnection,
    uid: str
):
    """Soft-delete a chat by setting deleted_at to now."""
    now = datetime.now()
    query = "UPDATE chats SET deleted_at = %s WHERE uid = %s"

    async with conn.cursor() as cur:
        await cur.execute(query, (now, uid))

    await conn.commit()


async def _dangerous_hard_delete_chat_by_uid(
    conn: AsyncConnection,
    uid: str
):
    """Hard delete a chat by UID. Use with caution."""
    query = "DELETE FROM chats WHERE uid = %s"
    async with conn.cursor() as cur:
        await cur.execute(query, (uid,))
    await conn.commit()


async def list_chats_by_user_uid(
    conn: AsyncConnection,
    user_uid: str
) -> list[Chat]:
    """List all chats for a given user UID.

    Returns a list of Chat objects.
    """
    query = (
        "SELECT id, uid, label, user_uid, "
        "graph_uid, created_at, updated_at, deleted_at "
        "FROM chats WHERE user_uid = %s "
        "AND deleted_at IS NULL "
        "ORDER BY COALESCE(updated_at, created_at) DESC"
    )
    async with conn.cursor() as cur:
        await cur.execute(query, (user_uid,))
        rows = await cur.fetchall()
        return [
            Chat(
                id=row[0],
                uid=row[1],
                label=row[2],
                user_uid=row[3],
                graph_uid=row[4],
                created_at=row[5].isoformat() if row[5] else None,
                updated_at=row[6].isoformat() if row[6] else None,
                deleted_at=row[7].isoformat() if row[7] else None
            ) for row in rows
        ]
