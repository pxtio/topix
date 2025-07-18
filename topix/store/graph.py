"""GraphStore for managing graph data in the database."""

from topix.datatypes.graph.graph import Graph
from topix.datatypes.note.link import Link
from topix.datatypes.note.note import Note
from topix.store.postgres.graph import _dangerous_hard_delete_graph_by_uid, create_graph, delete_graph_by_uid, get_graph_by_uid, update_graph_by_uid
from topix.store.postgres.graph_user import associate_user_to_graph_by_uid
from topix.store.postgres.pool import create_pool
from topix.store.qdrant.store import ContentStore


class GraphStore:
    """Store for managing graph data in the database."""

    def __init__(self):
        """Initialize the GraphStore."""
        self._content_store = ContentStore()
        self._pg_pool = create_pool()

    async def open(self):
        """Open the database connection pool."""
        await self._pg_pool.open()

    async def add_nodes(self, nodes: list[Note]):
        """Add nodes to the graph."""
        await self._content_store.add(nodes)

    async def update_node(self, node_id: str, data: dict):
        """Update a node in the graph."""
        await self._content_store.update(node_id, data)

    async def delete_node(self, node_id: str):
        """Delete a node from the graph."""
        await self._content_store.delete(node_id)

    async def get_nodes(self, node_ids: list[str]) -> list[Note]:
        """Retrieve nodes by their IDs."""
        return await self._content_store.mget(node_ids)

    async def add_links(self, links: list[Link]):
        """Add links to the graph."""
        await self._content_store.add(links)

    async def update_link(self, link_id: str, data: dict):
        """Update a link in the graph."""
        await self._content_store.update(link_id, data)

    async def delete_link(self, link_id: str):
        """Delete a link from the graph."""
        await self._content_store.delete(link_id)

    async def get_links(self, link_ids: list[str]) -> list[Link]:
        """Retrieve links by their IDs."""
        return await self._content_store.mget(link_ids)

    async def get_graph(self, graph_uid: str) -> Graph | None:
        """Retrieve the entire graph by its UID."""
        async with self._pg_pool.connection() as conn:
            graph = await get_graph_by_uid(conn, graph_uid)
        if not graph:
            return None
        graph.nodes = await self._content_store.filt(
            filters={
                "must": [
                    {"key": "type", "match": {"value": "note"}},
                    {"key": "graph_uid", "match": {"value": graph_uid}}
                ]
            }
        )
        graph.edges = await self._content_store.filt(
            filters={
                "must": [
                    {"key": "type", "match": {"value": "link"}},
                    {"key": "graph_uid", "match": {"value": graph_uid}}
                ]
            }
        )
        return graph

    async def add_graph(self, graph: Graph, user_uid: str) -> Graph:
        """Create a new graph."""
        async with self._pg_pool.connection() as conn:
            await create_graph(conn, graph)
            await associate_user_to_graph_by_uid(conn, graph.uid, user_uid, "owner")

    async def update_graph(self, graph_uid: str, data: dict):
        """Update an existing graph."""
        async with self._pg_pool.connection() as conn:
            await update_graph_by_uid(conn, graph_uid, data)

    async def delete_graph(self, graph_uid: str, hard_delete: bool = False):
        """Delete a graph by its UID."""
        async with self._pg_pool.connection() as conn:
            if not hard_delete:
                await delete_graph_by_uid(conn, graph_uid)
            else:
                await _dangerous_hard_delete_graph_by_uid(conn, graph_uid)

        await self._content_store.delete_by_filters(
            filters={
                "must": [
                    {"key": "graph_uid", "match": {"value": graph_uid}}
                ]
            }
        )

    async def close(self):
        """Close the database connection pool."""
        await self._pg_pool.close()
