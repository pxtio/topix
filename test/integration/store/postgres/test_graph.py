from datetime import datetime
import logging

from psycopg import AsyncConnection

from topix.datatypes.graph.graph import Edge, Graph, Node, Position
from topix.datatypes.graph.node import NodeData
from topix.datatypes.graph.style import Style
from topix.store.postgres.graph import (
    _dangerous_hard_delete_graph_by_uid,
    create_graph,
    delete_graph_by_uid,
    get_graph_by_uid,
    update_graph_by_uid
)
from topix.utils.common import gen_uid


logger = logging.getLogger(__name__)


def make_example_node(node_id="node1"):
    return Node(
        id=node_id,
        data=NodeData(
            note=None,
            style=Style(
                type="rectangle",
                angle=0.0,
                stroke_color="#000",
                background_color="#fff",
                fill_style="solid",
                stroke_width=2,
                stroke_style="solid",
                roughness=1.0,
                opacity=100,
                group_ids=[],
                font_family="Arial",
                text_align="left",
                color="#000"
            )
        ),
        position=Position(x=100, y=200),
        type="custom"
    )


def make_example_edge(edge_id="edge1", source="node1", target="node2"):
    return Edge(
        id=edge_id,
        source=source,
        target=target,
        data=None,
        type="line"
    )


async def test_graph_crud(conn: AsyncConnection):
    # 1. Create a graph
    graph_uid = gen_uid()
    node = make_example_node()
    edge = make_example_edge(source=node.id, target=node.id)
    graph = Graph(
        id=0,  # Will be set after insert
        uid=graph_uid,
        label="Test Graph",
        nodes=[node],
        edges=[edge],
        format_version=1,
        readonly=False,
        created_at=datetime.now().isoformat()
    )

    # CREATE
    created_graph = await create_graph(conn, graph)
    assert created_graph.id is not None

    logger.info(f"Created graph with ID: {created_graph.id}")
    assert created_graph.uid == graph_uid

    # GET
    loaded_graph = await get_graph_by_uid(conn, graph_uid)
    assert loaded_graph is not None
    assert loaded_graph.uid == graph_uid
    assert loaded_graph.label == "Test Graph"
    assert len(loaded_graph.nodes) == 1
    assert len(loaded_graph.edges) == 1
    assert loaded_graph.nodes[0].id == node.id

    # UPDATE
    new_label = "Graph Updated"
    new_nodes = [make_example_node(node_id="node2")]
    await update_graph_by_uid(
        conn,
        graph_uid,
        {"label": new_label, "nodes": [n.model_dump() for n in new_nodes]}
    )

    updated_graph = await get_graph_by_uid(conn, graph_uid)
    assert updated_graph is not None
    assert updated_graph.label == new_label
    assert len(updated_graph.nodes) == 1
    assert updated_graph.nodes[0].id == "node2"

    # DELETE (soft)
    await delete_graph_by_uid(conn, graph_uid)
    deleted_graph = await get_graph_by_uid(conn, graph_uid)
    assert deleted_graph is None

    # HARD DELETE
    await _dangerous_hard_delete_graph_by_uid(conn, graph_uid)
    gone_graph = await get_graph_by_uid(conn, graph_uid)
    assert gone_graph is None
