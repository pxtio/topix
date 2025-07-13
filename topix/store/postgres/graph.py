"""Graph management functions for PostgreSQL backend."""

from psycopg import AsyncConnection
from psycopg.types.json import Json

from topix.datatypes.graph.graph import Graph


async def create_graph_with_owner(
    conn: AsyncConnection,
    graph: Graph,
    owner_user_uid: str
) -> Graph:
    """
    Create a graph and associate the owner by UID.
    Updates graph.id with the DB-generated ID.
    """
    user_id_query = "SELECT id FROM users WHERE uid = %s"
    async with conn.cursor() as cur:
        await cur.execute(user_id_query, (owner_user_uid,))
        user_row = await cur.fetchone()
        if not user_row:
            raise ValueError("Owner UID not found")
        owner_user_id = user_row[0]

    insert_graph_query = (
        "INSERT INTO graphs (uid, name, readonly, label, graph_data, graph_version) "
        "VALUES (%s, %s, %s, %s, %s, %s) RETURNING id"
    )
    graph_data = {
        "nodes": graph.nodes.model_dump(exclude_none=True),
        "edges": graph.edges.model_dump(exclude_none=True)
    }
    async with conn.cursor() as cur:
        await cur.execute(
            insert_graph_query,
            (
                graph.uid,
                graph.name,
                graph.readonly,
                graph.label,
                Json(graph_data),
                graph.graph_version
            )
        )
        row = await cur.fetchone()
        graph.id = row[0]

    insert_owner_query = (
        "INSERT INTO graph_user (graph_id, user_id, role) VALUES (%s, %s, 'owner')"
    )
    async with conn.cursor() as cur:
        await cur.execute(insert_owner_query, (graph.id, owner_user_id))

    return graph


async def get_graph_by_uid(
    conn: AsyncConnection,
    uid: str
) -> Graph | None:
    """
    Retrieve a graph by UID. Returns None if not found.
    """
    query = (
        "SELECT id, uid, name, readonly, label, graph_data, graph_version, created_at "
        "FROM graphs WHERE uid = %s"
    )
    async with conn.cursor() as cur:
        await cur.execute(query, (uid,))
        row = await cur.fetchone()
        if not row:
            return None
        graph_data = row[5] or {"nodes": [], "edges": []}
        return Graph(
            id=row[0],
            uid=row[1],
            name=row[2],
            readonly=row[3],
            label=row[4],
            nodes=graph_data.get("nodes", []),
            edges=graph_data.get("edges", []),
            graph_version=row[6],
            created_at=row[7]
        )


async def update_graph_by_uid(
    conn: AsyncConnection,
    uid: str,
    updated_data: dict
):
    """
    Update one or more fields of a graph by UID.
    Handles partial update for JSONB nodes/edges.
    """
    set_clauses = []
    values = []
    if "nodes" in updated_data or "edges" in updated_data:
        select_query = "SELECT graph_data FROM graphs WHERE uid = %s"
        async with conn.cursor() as cur:
            await cur.execute(select_query, (uid,))
            row = await cur.fetchone()
            current = row[0] if row else {"nodes": [], "edges": []}
        if "nodes" in updated_data:
            current["nodes"] = updated_data.pop("nodes")
        if "edges" in updated_data:
            current["edges"] = updated_data.pop("edges")
        set_clauses.append("graph_data = %s")
        values.append(Json(current))
    for k, v in updated_data.items():
        if k in ("name", "readonly", "label", "graph_version"):
            set_clauses.append(f"{k} = %s")
            values.append(v)
    if not set_clauses:
        return
    values.append(uid)
    query = f"UPDATE graphs SET {', '.join(set_clauses)} WHERE uid = %s"
    async with conn.cursor() as cur:
        await cur.execute(query, tuple(values))


async def delete_graph_by_uid(
    conn: AsyncConnection,
    uid: str
):
    """
    Delete a graph by its UID.
    """
    query = "DELETE FROM graphs WHERE uid = %s"
    async with conn.cursor() as cur:
        await cur.execute(query, (uid,))
