from datetime import datetime

from psycopg import AsyncConnection
from psycopg.types.json import Json

from topix.datatypes.graph.graph import Edge, Graph, Node


async def create_graph(
    conn: AsyncConnection,
    graph: Graph
) -> Graph:
    """Insert a graph and return it with id set.
    """
    query = (
        "INSERT INTO graphs (uid, label, nodes, edges, format_version, readonly, "
        "created_at, updated_at, deleted_at) "
        "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s) "
        "RETURNING id"
    )
    async with conn.cursor() as cur:
        await cur.execute(
            query,
            (
                graph.uid,
                graph.label,
                Json([n.model_dump(exclude_none=True) for n in graph.nodes]),
                Json([e.model_dump(exclude_none=True) for e in graph.edges]),
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
    """Fetch a graph ID by its unique UID.
    Returns None if not found.
    """
    query = "SELECT id FROM graphs WHERE uid = %s AND deleted_at IS NULL"
    async with conn.cursor() as cur:
        await cur.execute(query, (uid,))
        row = await cur.fetchone()
        return row[0] if row else None


async def get_graph_by_uid(
    conn: AsyncConnection,
    uid: str
) -> Graph | None:
    """Fetch a graph by UID.
    """
    query = (
        "SELECT id, uid, label, nodes, edges, format_version, readonly, "
        "created_at, updated_at, deleted_at "
        "FROM graphs WHERE uid = %s AND deleted_at IS NULL"
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
            nodes=[Node(**n) for n in row[3] or []],
            edges=[Edge(**e) for e in row[4] or []],
            format_version=row[5],
            readonly=row[6],
            created_at=row[7].isoformat() if row[7] else None,
            updated_at=row[8].isoformat() if row[8] else None,
            deleted_at=row[9].isoformat() if row[9] else None,
        )


async def update_graph_by_uid(
    conn: AsyncConnection,
    uid: str,
    updated_data: dict
):
    """Update non-date fields of a graph by UID.
    Always sets updated_at to now. Does NOT allow updating created_at or deleted_at.
    """
    set_clauses = []
    values = []

    # Only allow certain fields
    allowed_fields = {"label", "format_version", "readonly", "nodes", "edges"}

    # Nodes/edges as JSONB
    if "nodes" in updated_data:
        set_clauses.append("nodes = %s")
        values.append(Json(updated_data.pop("nodes")))
    if "edges" in updated_data:
        set_clauses.append("edges = %s")
        values.append(Json(updated_data.pop("edges")))

    # Other allowed fields (non-date)
    for k, v in updated_data.items():
        if k in allowed_fields - {"nodes", "edges"}:
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
    """Soft-delete a graph by setting deleted_at to now.
    """
    now = datetime.now()
    query = "UPDATE graphs SET deleted_at = %s WHERE uid = %s"
    async with conn.cursor() as cur:
        await cur.execute(query, (now, uid))
    await conn.commit()


async def _dangerous_hard_delete_graph_by_uid(
    conn: AsyncConnection,
    uid: str
) -> None:
    """Permanently delete a graph by UID.
    """
    query = "DELETE FROM graphs WHERE uid = %s"
    async with conn.cursor() as cur:
        await cur.execute(query, (uid,))
    await conn.commit()
