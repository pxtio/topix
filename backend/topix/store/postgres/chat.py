"""Chat management functions for PostgreSQL backend."""

from datetime import datetime

import asyncpg

from topix.datatypes.chat.chat import Chat


async def create_chat(
    conn: asyncpg.Connection,
    chat: Chat
) -> Chat:
    """Insert a new chat using user_uid as FK and set its id after creation."""
    query = (
        "INSERT INTO chats (uid, label, user_uid, graph_uid, "
        "created_at, updated_at, deleted_at) "
        "VALUES ($1, $2, $3, $4, $5, $6, $7) "
        "RETURNING id"
    )
    chat_id = await conn.fetchval(
        query,
        chat.uid,
        chat.label,
        chat.user_uid,
        chat.graph_uid,
        datetime.fromisoformat(chat.created_at) if chat.created_at else None,
        datetime.fromisoformat(chat.updated_at) if chat.updated_at else None,
        datetime.fromisoformat(chat.deleted_at) if chat.deleted_at else None,
    )
    chat.id = chat_id
    return chat


async def get_chat_by_uid(
    conn: asyncpg.Connection,
    uid: str
) -> Chat | None:
    """Fetch a chat by its UID.

    Returns None if not found.
    """
    query = (
        "SELECT id, uid, label, user_uid, "
        "graph_uid, created_at, updated_at, deleted_at "
        "FROM chats WHERE uid = $1"
    )
    row = await conn.fetchrow(query, uid)
    if not row:
        return None
    return Chat(
        id=row['id'],
        uid=row['uid'],
        label=row['label'],
        user_uid=row['user_uid'],
        graph_uid=row['graph_uid'],
        created_at=row['created_at'].isoformat() if row['created_at'] else None,
        updated_at=row['updated_at'].isoformat() if row['updated_at'] else None,
        deleted_at=row['deleted_at'].isoformat() if row['deleted_at'] else None
    )


async def update_chat_by_uid(
    conn: asyncpg.Connection,
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

    # Build dynamic query with positional parameters
    set_clauses = [f"{k} = ${i + 1}" for i, k in enumerate(data.keys())]
    set_clause = ', '.join(set_clauses)
    values = list(data.values())

    # Add uid as the last parameter
    values.append(uid)
    query = f"UPDATE chats SET {set_clause} WHERE uid = ${len(values)}"

    await conn.execute(query, *values)


async def delete_chat_by_uid(
    conn: asyncpg.Connection,
    uid: str
):
    """Soft-delete a chat by setting deleted_at to now."""
    now = datetime.now()
    query = "UPDATE chats SET deleted_at = $1 WHERE uid = $2"
    await conn.execute(query, now, uid)


async def _dangerous_hard_delete_chat_by_uid(
    conn: asyncpg.Connection,
    uid: str
):
    """Hard delete a chat by UID. Use with caution."""
    query = "DELETE FROM chats WHERE uid = $1"
    await conn.execute(query, uid)


async def list_chats_by_user_uid(
    conn: asyncpg.Connection,
    user_uid: str,
    graph_uid: str | None = None,
    offset: int = 0,
    limit: int = 100
) -> list[Chat]:
    """List all chats for a given user UID.

    Returns a list of Chat objects.
    """
    if graph_uid is not None:
        query = (
            "SELECT id, uid, label, user_uid, "
            "graph_uid, created_at, updated_at, deleted_at "
            "FROM chats WHERE user_uid = $1 "
            "AND graph_uid = $2 "
            "AND deleted_at IS NULL "
            "ORDER BY COALESCE(updated_at, created_at) DESC "
            "LIMIT $3 OFFSET $4"
        )
        rows = await conn.fetch(query, user_uid, graph_uid, limit, offset)
    else:
        query = (
            "SELECT id, uid, label, user_uid, "
            "graph_uid, created_at, updated_at, deleted_at "
            "FROM chats WHERE user_uid = $1 "
            "AND deleted_at IS NULL "
            "ORDER BY COALESCE(updated_at, created_at) DESC "
            "LIMIT $2 OFFSET $3"
        )
        rows = await conn.fetch(query, user_uid, limit, offset)
    return [
        Chat(
            id=row['id'],
            uid=row['uid'],
            label=row['label'],
            user_uid=row['user_uid'],
            graph_uid=row['graph_uid'],
            created_at=row['created_at'].isoformat() if row['created_at'] else None,
            updated_at=row['updated_at'].isoformat() if row['updated_at'] else None,
            deleted_at=row['deleted_at'].isoformat() if row['deleted_at'] else None
        ) for row in rows
    ]
