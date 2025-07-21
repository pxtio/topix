from datetime import datetime

from psycopg import AsyncConnection

from topix.datatypes.graph.graph import Graph


async def create_graph(
    conn: AsyncConnection,
    graph: Graph
) -> Graph:
    """Insert a graph and return it with id set."""
    query = (
        "INSERT INTO graphs (uid, label, format_version, readonly, "
        "created_at, updated_at, deleted_at) "
        "VALUES (%s, %s, %s, %s, %s, %s, %s) "
        "RETURNING id"
    )
    async with conn.cursor() as cur:
        await cur.execute(
            query,
            (
                graph.uid,
                graph.label,
                graph.format_version,
                graph.readonly,
                datetime.fromisoformat(graph.created_at) if graph.created_at else None,
                datetime.fromisoformat(graph.updated_at) if graph.updated_at else None,
                datetime.fromisoformat(graph.deleted_at) if graph.deleted_at else None,
            ),
        )
        row = await cur.fetchone()
        graph.id = row[0]
    await conn.commit()
    return graph


async def get_graph_id_by_uid(
    conn: AsyncConnection,
    uid: str
) -> int | None:
    """Fetch a graph ID by its unique UID."""
    query = "SELECT id FROM graphs WHERE uid = %s AND deleted_at IS NULL"
    async with conn.cursor() as cur:
        await cur.execute(query, (uid,))
        row = await cur.fetchone()
        return row[0] if row else None


async def get_graph_by_uid(
    conn: AsyncConnection,
    uid: str
) -> Graph | None:
    """Fetch a graph by UID."""
    query = (
        "SELECT id, uid, label, format_version, readonly, "
        "created_at, updated_at, deleted_at "
        "FROM graphs WHERE uid = %s"
    )
    async with conn.cursor() as cur:
        await cur.execute(query, (uid,))
        row = await cur.fetchone()
        if not row:
            return None
        return Graph(
            id=row[0],
            uid=row[1],
            label=row[2],
            format_version=row[3],
            readonly=row[4],
            created_at=row[5].isoformat() if row[5] else None,
            updated_at=row[6].isoformat() if row[6] else None,
            deleted_at=row[7].isoformat() if row[7] else None,
        )


async def update_graph_by_uid(
    conn: AsyncConnection,
    uid: str,
    updated_data: dict
):
    """Update non-date fields of a graph by UID."""
    set_clauses = []
    values = []

    # Only allow certain fields
    allowed_fields = {"label", "format_version", "readonly"}

    # Other allowed fields (non-date)
    for k, v in updated_data.items():
        if k in allowed_fields:
            set_clauses.append(f"{k} = %s")
            values.append(v)

    # Always update updated_at
    now = datetime.now()
    set_clauses.append("updated_at = %s")
    values.append(now)

    if not set_clauses:
        return
    values.append(uid)
    query = f"UPDATE graphs SET {', '.join(set_clauses)} WHERE uid = %s"
    async with conn.cursor() as cur:
        await cur.execute(query, tuple(values))
    await conn.commit()


async def delete_graph_by_uid(
    conn: AsyncConnection,
    uid: str
):
    """Soft-delete a graph by setting deleted_at to now."""
    now = datetime.now()
    query = "UPDATE graphs SET deleted_at = %s WHERE uid = %s"
    async with conn.cursor() as cur:
        await cur.execute(query, (now, uid))
    await conn.commit()


async def _dangerous_hard_delete_graph_by_uid(
    conn: AsyncConnection,
    uid: str
) -> None:
    """Permanently delete a graph by UID (use with caution!)."""
    query = "DELETE FROM graphs WHERE uid = %s"
    async with conn.cursor() as cur:
        await cur.execute(query, (uid,))
    await conn.commit()
