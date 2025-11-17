"""Graph User Base Postgres Store."""
import asyncpg

from topix.datatypes.graph.graph import Graph
from topix.store.postgres.graph import get_graph_id_by_uid
from topix.store.postgres.user import get_user_id_by_uid


async def add_user_to_graph_by_uid(
    conn: asyncpg.Connection,
    graph_uid: str,
    user_uid: str,
    role: str,
) -> bool:
    """Associate a user (by uid) to a graph (by uid) with a role.

    Returns True if added, False if already exists.
    """
    graph_id = await get_graph_id_by_uid(conn, graph_uid)
    user_id = await get_user_id_by_uid(conn, user_uid)
    if graph_id is None or user_id is None:
        raise ValueError(
            "Invalid graph_uid or user_uid: "
            f"graph_uid={graph_uid}, user_uid={user_uid}"
        )

    select_query = (
        "SELECT 1 FROM graph_user WHERE graph_id = $1 AND user_id = $2"
    )
    insert_query = (
        "INSERT INTO graph_user (graph_id, user_id, role) VALUES ($1, $2, $3)"
    )

    exists = await conn.fetchval(select_query, graph_id, user_id)
    if exists:
        return False

    await conn.execute(insert_query, graph_id, user_id, role)
    return True


async def list_graphs_by_user_uid(
    conn: asyncpg.Connection,
    user_uid: str
) -> list[Graph]:
    """Return list of (graph_uid, role) for all graphs the user has access to."""
    user_id = await get_user_id_by_uid(conn, user_uid)
    if user_id is None:
        return []

    query = (
        "SELECT g.id, g.uid, g.label, g.readonly, g.thumbnail, g.created_at, g.updated_at, g.deleted_at "
        "FROM graph_user gu JOIN graphs g ON gu.graph_id = g.id "
        "WHERE gu.user_id = $1 "
        "AND g.deleted_at IS NULL "
        "ORDER BY COALESCE(g.updated_at, g.created_at) DESC"
    )
    rows = await conn.fetch(query, user_id)

    # List of graph objects
    return [
        Graph(
            id=row['id'],
            uid=row['uid'],
            label=row['label'],
            readonly=row['readonly'],
            thumbnail=row['thumbnail'],
            created_at=row['created_at'].isoformat() if row['created_at'] else None,
            updated_at=row['updated_at'].isoformat() if row['updated_at'] else None,
            deleted_at=row['deleted_at'].isoformat() if row['deleted_at'] else None
        ) for row in rows
    ]


async def list_users_by_graph_uid(
    conn: asyncpg.Connection,
    graph_uid: str
):
    """Return list of (user_uid, role) for all users having access to this graph."""
    graph_id = await get_graph_id_by_uid(conn, graph_uid)
    if graph_id is None:
        return []

    query = (
        "SELECT u.uid, gu.role "
        "FROM graph_user gu JOIN users u ON gu.user_id = u.id "
        "WHERE gu.graph_id = $1"
    )
    rows = await conn.fetch(query, graph_id)

    # List of tuples (user_uid, role)
    return [(row['uid'], row['role']) for row in rows]


async def remove_user_from_graph_by_uid(
    conn: asyncpg.Connection,
    user_uid: str,
    graph_uid: str
) -> int:
    """Remove a user (by uid) from a graph's access list.

    Returns number of rows deleted (0 or 1).
    """
    user_id = await get_user_id_by_uid(conn, user_uid)
    graph_id = await get_graph_id_by_uid(conn, graph_uid)
    if user_id is None or graph_id is None:
        return 0

    query = (
        "DELETE FROM graph_user WHERE user_id = $1 AND graph_id = $2"
    )
    result = await conn.execute(query, user_id, graph_id)
    # asyncpg returns "DELETE N" where N is the number of rows deleted
    return int(result.split()[-1])
