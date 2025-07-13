"""Chat management functions for PostgreSQL backend."""

from psycopg import AsyncConnection

from topix.datatypes.chat.chat import Chat


async def create_chat(
    conn: AsyncConnection,
    chat: Chat
) -> Chat:
    """
    Insert a new chat using user_uid as FK and set its id after creation.
    """
    query = (
        "INSERT INTO chats (uid, label, user_uid, created_at, updated_at, deleted_at) "
        "VALUES (%s, %s, %s, %s, %s, %s) "
        "RETURNING id"
    )
    async with conn.cursor() as cur:
        await cur.execute(
            query,
            (
                chat.uid,
                chat.label,
                chat.user_uid,
                chat.created_at,
                chat.updated_at,
                chat.deleted_at,
            )
        )
        row = await cur.fetchone()
        chat.id = row[0]
        return chat


async def get_chat_by_uid(
    conn: AsyncConnection,
    uid: str
) -> Chat | None:
    """
    Fetch a chat by its UID. Returns None if not found.
    """
    query = (
        "SELECT id, uid, label, user_uid, created_at, updated_at, deleted_at "
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
            created_at=row[4],
            updated_at=row[5],
            deleted_at=row[6]
        )


async def update_chat_by_uid(
    conn: AsyncConnection,
    uid: str,
    updated_data: dict
):
    """
    Update chat fields by UID. Supports partial updates.
    """
    if not updated_data:
        return
    set_clause = ', '.join(f"{k} = %s" for k in updated_data)
    values = list(updated_data.values())
    values.append(uid)
    query = f"UPDATE chats SET {set_clause} WHERE uid = %s"
    async with conn.cursor() as cur:
        await cur.execute(query, tuple(values))


async def delete_chat_by_uid(
    conn: AsyncConnection,
    uid: str
):
    """
    Soft-delete a chat by setting deleted_at to now.
    """
    from datetime import datetime
    now = datetime.now()
    query = "UPDATE chats SET deleted_at = %s WHERE uid = %s"
    async with conn.cursor() as cur:
        await cur.execute(query, (now, uid))
