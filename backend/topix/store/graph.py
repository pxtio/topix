"""GraphStore for managing graph data in the database."""

from qdrant_client.models import FieldCondition, Filter, MatchAny, MatchValue

from topix.datatypes.graph.graph import Graph
from topix.datatypes.note.link import Link
from topix.datatypes.note.note import Note
from topix.store.postgres.graph import (
    _dangerous_hard_delete_graph_by_uid,
    create_graph,
    delete_graph_by_uid,
    get_graph_by_uid,
    update_graph_by_uid,
)
from topix.store.postgres.graph_user import (
    add_user_to_graph_by_uid,
    list_graphs_by_user_uid,
)
from topix.store.postgres.pool import create_pool
from topix.store.qdrant.store import ContentStore


class GraphStore:
    """Store for managing graph data in the database."""

    def __init__(self):
        """Initialize the GraphStore."""
        self._content_store = ContentStore.from_config()
        self._pg_pool = None

    async def open(self):
        """Open the database connection pool."""
        self._pg_pool = await create_pool()

    async def add_notes(self, nodes: list[Note]):
        """Add nodes to the graph."""
        await self._content_store.add(nodes)

    async def update_node(self, node_id: str, data: dict):
        """Update a node in the graph."""
        data["id"] = node_id
        await self._content_store.update([data])

    async def delete_node(self, node_id: str, hard_delete: bool = True):
        """Delete a node from the graph."""
        await self._content_store.delete([node_id], hard_delete=hard_delete)

    async def get_nodes(self, node_ids: list[str]) -> list[Note]:
        """Retrieve nodes by their IDs."""
        results = await self._content_store.get(node_ids)
        return [result.resource for result in results]

    async def add_links(self, links: list[Link]):
        """Add links to the graph."""
        await self._content_store.add(links)

    async def update_link(self, link_id: str, data: dict):
        """Update a link in the graph."""
        data["id"] = link_id
        await self._content_store.update([data])

    async def delete_link(self, link_id: str):
        """Delete a link from the graph."""
        await self._content_store.delete([link_id], hard_delete=True)

    async def get_links(self, link_ids: list[str]) -> list[Link]:
        """Retrieve links by their IDs."""
        results = await self._content_store.get(link_ids)
        return [result.resource for result in results]

    async def get_graph(self, graph_uid: str) -> Graph | None:
        """Retrieve the entire graph by its UID."""
        async with self._pg_pool.acquire() as conn:
            graph = await get_graph_by_uid(conn, graph_uid)
        if not graph:
            return None
        node_results = await self._content_store.filt(
            filters=Filter(
                must=[
                    FieldCondition(
                        key="graph_uid",
                        match=MatchValue(value=graph_uid),
                    ),
                    FieldCondition(
                        key="type",
                        match=MatchAny(any=["note", "document"]),
                    ),
                ]
            )
        )
        graph.nodes = [result.resource for result in node_results]
        link_results = await self._content_store.filt(
            filters=Filter(
                must=[
                    FieldCondition(
                        key="graph_uid",
                        match=MatchValue(value=graph_uid),
                    ),
                    FieldCondition(
                        key="type",
                        match=MatchValue(value="link"),
                    ),
                ]
            )
        )
        graph.edges = [result.resource for result in link_results]
        return graph

    async def add_graph(self, graph: Graph, user_uid: str) -> Graph:
        """Create a new graph."""
        async with self._pg_pool.acquire() as conn:
            await create_graph(conn, graph)
            await add_user_to_graph_by_uid(conn, graph.uid, user_uid, "owner")

    async def update_graph(self, graph_uid: str, data: dict):
        """Update an existing graph."""
        async with self._pg_pool.acquire() as conn:
            await update_graph_by_uid(conn, graph_uid, data)

    async def delete_graph(self, graph_uid: str, hard_delete: bool = False):
        """Delete a graph by its UID."""
        async with self._pg_pool.acquire() as conn:
            if not hard_delete:
                await delete_graph_by_uid(conn, graph_uid)
            else:
                await _dangerous_hard_delete_graph_by_uid(conn, graph_uid)

        await self._content_store.delete_by_filters(
            filters={"must": [{"key": "graph_uid", "match": {"value": graph_uid}}]},
            hard_delete=hard_delete
        )

    async def list_graphs(self, user_uid: str) -> list[Graph]:
        """List all graphs' ids and labels for a user."""
        async with self._pg_pool.acquire() as conn:
            graphs = await list_graphs_by_user_uid(conn, user_uid)
        return graphs

    async def close(self):
        """Close the database connection pool."""
        if self._pg_pool:
            await self._pg_pool.close()
        await self._content_store.close()
