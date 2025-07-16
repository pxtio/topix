from psycopg import AsyncConnection

from topix.store.postgres.graph import get_graph_id_by_uid
from topix.store.postgres.user import get_user_id_by_uid


async def associate_user_to_graph_by_uid(
    conn: AsyncConnection,
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
        "SELECT 1 FROM graph_user WHERE graph_id = %s AND user_id = %s"
    )
    insert_query = (
        "INSERT INTO graph_user (graph_id, user_id, role) VALUES (%s, %s, %s)"
    )
    async with conn.cursor() as cur:
        await cur.execute(select_query, (graph_id, user_id))
        exists = await cur.fetchone()
        if exists:
            return False
        await cur.execute(insert_query, (graph_id, user_id, role))
        return True


async def list_graphs_for_user_uid(
    conn: AsyncConnection,
    user_uid: str
):
    """Return list of (graph_uid, role) for all graphs the user has access to.
    """
    user_id = await get_user_id_by_uid(conn, user_uid)
    if user_id is None:
        return []
    query = (
        "SELECT g.uid, gu.role "
        "FROM graph_user gu JOIN graphs g ON gu.graph_id = g.id "
        "WHERE gu.user_id = %s"
    )
    async with conn.cursor() as cur:
        await cur.execute(query, (user_id,))
        return await cur.fetchall()  # List of tuples (graph_uid, role)


async def list_users_for_graph_uid(
    conn: AsyncConnection,
    graph_uid: str
):
    """Return list of (user_uid, role) for all users having access to this graph.
    """
    graph_id = await get_graph_id_by_uid(conn, graph_uid)
    if graph_id is None:
        return []
    query = (
        "SELECT u.uid, gu.role "
        "FROM graph_user gu JOIN users u ON gu.user_id = u.id "
        "WHERE gu.graph_id = %s"
    )
    async with conn.cursor() as cur:
        await cur.execute(query, (graph_id,))
        return await cur.fetchall()  # List of tuples (user_uid, role)


async def remove_user_from_graph_by_uid(
    conn: AsyncConnection,
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
        "DELETE FROM graph_user WHERE user_id = %s AND graph_id = %s"
    )
    async with conn.cursor() as cur:
        await cur.execute(query, (user_id, graph_id))
        return cur.rowcount
