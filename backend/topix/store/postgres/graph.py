"""Graph Base Postgres Store."""

from datetime import datetime

import asyncpg

from topix.datatypes.graph.graph import Graph


async def create_graph(
    conn: asyncpg.Connection,
    graph: Graph
) -> Graph:
    """Insert a graph and return it with id set."""
    query = (
        "INSERT INTO graphs (uid, label, format_version, readonly, "
        "created_at, updated_at, deleted_at) "
        "VALUES ($1, $2, $3, $4, $5, $6, $7) "
        "RETURNING id"
    )
    graph_id = await conn.fetchval(
        query,
        graph.uid,
        graph.label,
        graph.format_version,
        graph.readonly,
        datetime.fromisoformat(graph.created_at) if graph.created_at else None,
        datetime.fromisoformat(graph.updated_at) if graph.updated_at else None,
        datetime.fromisoformat(graph.deleted_at) if graph.deleted_at else None,
    )
    graph.id = graph_id
    return graph


async def get_graph_id_by_uid(
    conn: asyncpg.Connection,
    uid: str
) -> int | None:
    """Fetch a graph ID by its unique UID."""
    query = "SELECT id FROM graphs WHERE uid = $1 AND deleted_at IS NULL"
    return await conn.fetchval(query, uid)


async def get_graph_by_uid(
    conn: asyncpg.Connection,
    uid: str
) -> Graph | None:
    """Fetch a graph by UID."""
    query = (
        "SELECT id, uid, label, format_version, readonly, thumbnail, "
        "created_at, updated_at, deleted_at "
        "FROM graphs WHERE uid = $1"
    )
    row = await conn.fetchrow(query, uid)
    if not row:
        return None
    return Graph(
        id=row['id'],
        uid=row['uid'],
        label=row['label'],
        format_version=row['format_version'],
        readonly=row['readonly'],
        thumbnail=row['thumbnail'],
        created_at=row['created_at'].isoformat() if row['created_at'] else None,
        updated_at=row['updated_at'].isoformat() if row['updated_at'] else None,
        deleted_at=row['deleted_at'].isoformat() if row['deleted_at'] else None,
    )


async def update_graph_by_uid(
    conn: asyncpg.Connection,
    uid: str,
    updated_data: dict
):
    """Update non-date fields of a graph by UID."""
    # Only allow certain fields
    allowed_fields = {"label", "format_version", "readonly", "thumbnail"}

    # Build SET clause with positional parameters
    set_clauses = []
    values = []
    idx = 1

    for k, v in updated_data.items():
        if k in allowed_fields:
            set_clauses.append(f"{k} = ${idx}")
            values.append(v)
            idx += 1

    # Always update updated_at
    now = datetime.now()
    set_clauses.append(f"updated_at = ${idx}")
    values.append(now)
    idx += 1

    if len(set_clauses) == 1:  # Only updated_at, no actual fields to update
        return

    # Add uid as the last parameter
    values.append(uid)
    query = f"UPDATE graphs SET {', '.join(set_clauses)} WHERE uid = ${idx}"

    await conn.execute(query, *values)


async def delete_graph_by_uid(
    conn: asyncpg.Connection,
    uid: str
):
    """Soft-delete a graph by setting deleted_at to now."""
    now = datetime.now()
    query = "UPDATE graphs SET deleted_at = $1 WHERE uid = $2"
    await conn.execute(query, now, uid)


async def _dangerous_hard_delete_graph_by_uid(
    conn: asyncpg.Connection,
    uid: str
) -> None:
    """Permanently delete a graph by UID (use with caution!)."""
    query = "DELETE FROM graphs WHERE uid = $1"
    await conn.execute(query, uid)
