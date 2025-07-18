import pytest

from topix.datatypes.graph.graph import Graph
from topix.datatypes.note.link import Link
from topix.datatypes.note.note import Content, Note
from topix.store.graph import GraphStore
from topix.store.qdrant.base import QdrantStore


@pytest.fixture(scope="module")
async def init_collection():
    await QdrantStore.from_config().create_collection()


@pytest.mark.asyncio
async def test_graph_crud_lifecycle(config, init_collection):
    store = GraphStore()
    await store.open()
    user_uid = "root"
    try:
        # 1. Create graph
        graph = Graph(label="Test Graph")
        await store.add_graph(graph, user_uid=user_uid)

        # 2. Fetch graph and assert fields
        stored_graph = await store.get_graph(graph.uid)
        assert stored_graph is not None
        assert stored_graph.uid == graph.uid
        assert stored_graph.label == "Test Graph"
        assert stored_graph.nodes == []
        assert stored_graph.edges == []

        # 3. Add nodes
        node1 = Note(label="First Node", graph_uid=graph.uid, content=Content(markdown="# Hello"))
        node2 = Note(label="Second Node", graph_uid=graph.uid, content=Content(markdown="World!"))
        await store.add_nodes([node1, node2])

        # 4. Fetch nodes and verify
        nodes = await store.get_nodes([node1.id, node2.id])
        assert {n.id for n in nodes} == {node1.id, node2.id}

        # 5. Add link between nodes
        link = Link(source=node1.id, target=node2.id, graph_uid=graph.uid)
        await store.add_links([link])

        # 6. Fetch links and verify
        links = await store.get_links([link.id])
        assert links[0].source == node1.id
        assert links[0].target == node2.id

        # 7. Fetch whole graph, check nodes and edges
        graph_with_data = await store.get_graph(graph.uid)
        assert any(n.id == node1.id for n in graph_with_data.nodes)
        assert any(e.id == link.id for e in graph_with_data.edges)

        # 8. Update a node
        await store.update_node(node1.id, {"label": "First Node Updated"})
        updated_nodes = await store.get_nodes([node1.id])
        assert updated_nodes[0].label == "First Node Updated"

        # 9. Delete a node
        await store.delete_node(node2.id)
        remaining_nodes = await store.get_nodes([node1.id, node2.id])
        assert len(remaining_nodes) == 1
        assert remaining_nodes[0].id == node1.id

        # 10. Delete graph (soft)
        await store.delete_graph(graph.uid, hard_delete=False)
        deleted_graph = await store.get_graph(graph.uid)
        assert deleted_graph is None
    finally:
        await store.close()


@pytest.mark.asyncio
async def test_hard_delete_graph_deletes_nodes_and_links(config):
    store = GraphStore()
    await store.open()
    try:
        user_uid = "root"
        graph = Graph(label="Hard Delete Graph")
        await store.add_graph(graph, user_uid=user_uid)

        node = Note(label="To be deleted", graph_uid=graph.uid, content=Content(markdown="delete me"))
        link = Link(source=node.id, target=node.id, graph_uid=graph.uid)
        await store.add_nodes([node])
        await store.add_links([link])

        # Hard delete
        await store.delete_graph(graph.uid, hard_delete=True)

        # All should be gone
        assert await store.get_graph(graph.uid) is None
        nodes = await store.get_nodes([node.id])
        assert not nodes  # should be empty list
        links = await store.get_links([link.id])
        assert not links
    finally:
        await store.close()
