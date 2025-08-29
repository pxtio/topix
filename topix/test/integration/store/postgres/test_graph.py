"""Integration tests for the Graph model."""
import logging

from datetime import datetime

from psycopg import AsyncConnection

from topix.datatypes.graph.graph import Graph
from topix.store.postgres.graph import (
    _dangerous_hard_delete_graph_by_uid,
    create_graph,
    delete_graph_by_uid,
    get_graph_by_uid,
    get_graph_id_by_uid,
    update_graph_by_uid,
)
from topix.utils.common import gen_uid

logger = logging.getLogger(__name__)


async def test_graph_crud(conn: AsyncConnection):
    """Test the CRUD operations for the Graph model in the Postgres store."""
    # 1. Create a graph
    graph_uid = gen_uid()
    graph = Graph(
        id=0,  # Will be set after insert
        uid=graph_uid,
        label="Test Graph",
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

    # GET ID
    graph_id = await get_graph_id_by_uid(conn, graph_uid)
    assert graph_id == created_graph.id

    # UPDATE
    new_label = "Graph Updated"
    await update_graph_by_uid(
        conn,
        graph_uid,
        {"label": new_label}
    )

    updated_graph = await get_graph_by_uid(conn, graph_uid)
    assert updated_graph is not None
    assert updated_graph.label == new_label

    # DELETE
    await delete_graph_by_uid(conn, graph_uid)
    deleted_graph = await get_graph_by_uid(conn, graph_uid)
    assert deleted_graph is not None
    assert deleted_graph.deleted_at is not None

    # HARD DELETE
    await _dangerous_hard_delete_graph_by_uid(conn, graph_uid)
    gone_graph = await get_graph_by_uid(conn, graph_uid)
    assert gone_graph is None
