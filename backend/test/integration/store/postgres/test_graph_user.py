"""Integration tests for the graph-user association."""
from datetime import datetime

import pytest
import pytest_asyncio

from topix.datatypes.graph.graph import Graph
from topix.datatypes.user import User
from topix.store.postgres.graph import _dangerous_hard_delete_graph_by_uid, create_graph
from topix.store.postgres.graph_user import (
    add_user_to_graph_by_uid,
    list_graphs_by_user_uid,
    list_users_by_graph_uid,
)
from topix.store.postgres.user import _dangerous_hard_delete_user_by_uid, create_user
from topix.utils.common import gen_uid


@pytest_asyncio.fixture(scope="module", loop_scope="module")
async def user_obj():
    """Fixture to create a user for testing graph associations."""
    user_uid = gen_uid()
    user = User(
        uid=user_uid,
        email=f"{user_uid}@test.com",
        username=user_uid,
        name="GraphUserTest",
        created_at=datetime.now(),
        password_hash="hashed_password"
    )
    return user


@pytest_asyncio.fixture(scope="module", loop_scope="module")
async def graph_obj():
    """Fixture to create a graph for testing user associations."""
    graph_uid = gen_uid()
    graph = Graph(
        id=None,
        uid=graph_uid,
        type="graph",
        label="GraphUserTest",
        nodes=[],
        edges=[],
        format_version=1,
        readonly=False,
        created_at=datetime.now().isoformat(),
    )
    return graph


@pytest.mark.asyncio
async def test_graph_user_assoc_and_listing(conn, user_obj, graph_obj):
    """Test user association with a graph and listing functionalities."""
    await create_user(conn, user_obj)
    await create_graph(conn, graph_obj)
    user_uid = user_obj.uid
    graph_uid = graph_obj.uid

    # 1. Associate user to graph as owner
    result = await add_user_to_graph_by_uid(conn, graph_uid, user_uid, "owner")
    assert result is True

    # 2. Cannot associate again (should be False, no duplicate)
    result2 = await add_user_to_graph_by_uid(conn, graph_uid, user_uid, "owner")
    assert result2 is False

    # 3. List graphs for user
    user_graphs = await list_graphs_by_user_uid(conn, user_uid)
    user_graph_tuples = [(g.uid, g.label) for g in user_graphs]
    assert (graph_uid, graph_obj.label) in user_graph_tuples

    # 4. List users for graph
    graph_users = await list_users_by_graph_uid(conn, graph_uid)
    assert (user_uid, "owner") in graph_users

    # 5. Add a second user as member
    user2_uid = gen_uid()
    user2 = User(
        uid=user2_uid,
        email=f"{user2_uid}@test.com",
        username=user2_uid,
        name="SecondUser",
        created_at=datetime.now(),
        password_hash="hashed_password"
    )
    await create_user(conn, user2)
    result3 = await add_user_to_graph_by_uid(conn, graph_uid, user2_uid, "member")
    assert result3 is True

    # 6. Check new associations
    graph_users2 = await list_users_by_graph_uid(conn, graph_uid)
    assert (user2_uid, "member") in graph_users2

    user2_graphs = await list_graphs_by_user_uid(conn, user2_uid)
    user2_graph_tuples = [(g.uid, g.label) for g in user2_graphs]
    assert (graph_uid, graph_obj.label) in user2_graph_tuples

    # 7. Clean up: delete user and graph
    await _dangerous_hard_delete_graph_by_uid(conn, graph_uid)
    await _dangerous_hard_delete_user_by_uid(conn, user_uid)
    await _dangerous_hard_delete_user_by_uid(conn, user2_uid)
