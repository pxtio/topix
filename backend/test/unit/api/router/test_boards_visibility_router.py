"""API tests for board visibility and access control behavior."""

from fastapi import FastAPI
from fastapi.testclient import TestClient

from topix.api.router.boards import router
from topix.api.utils.security import get_current_user_uid
from topix.datatypes.graph.graph import Graph


class _FakeGraphStore:
    """Minimal async store used by router access tests."""

    def __init__(self):
        self.roles: dict[tuple[str, str], str] = {}
        self.metadata: dict[str, Graph] = {}
        self.graphs: dict[str, Graph] = {}
        self.updated: list[tuple[str, dict]] = []

    async def get_graph_role(self, graph_uid: str, user_uid: str) -> str | None:
        return self.roles.get((graph_uid, user_uid))

    async def get_graph_metadata(self, graph_uid: str) -> Graph | None:
        return self.metadata.get(graph_uid)

    async def get_graph(self, graph_uid: str, root_id: str | None = None) -> Graph | None:
        return self.graphs.get(graph_uid)

    async def update_graph(self, graph_uid: str, data: dict):
        self.updated.append((graph_uid, data))
        graph = self.metadata.get(graph_uid)
        if graph and "visibility" in data:
            graph.visibility = data["visibility"]


def _build_client(store: _FakeGraphStore, user_uid: str = "viewer") -> TestClient:
    app = FastAPI()
    app.include_router(router)
    app.graph_store = store

    async def _fake_current_user_uid():
        return user_uid

    app.dependency_overrides[get_current_user_uid] = _fake_current_user_uid
    return TestClient(app)


def test_private_board_read_denied_for_non_member():
    """Non-member should receive 404 for private board reads."""
    store = _FakeGraphStore()
    graph_uid = "g-private"
    store.metadata[graph_uid] = Graph(uid=graph_uid, label="Private", visibility="private")
    store.graphs[graph_uid] = Graph(uid=graph_uid, label="Private", visibility="private")
    client = _build_client(store, user_uid="viewer")

    response = client.get(f"/boards/{graph_uid}")

    assert response.status_code == 404
    payload = response.json()
    assert payload["detail"] == "Board not found"


def test_public_board_read_allowed_for_non_member():
    """Non-member should read board when visibility is public."""
    store = _FakeGraphStore()
    graph_uid = "g-public"
    store.metadata[graph_uid] = Graph(uid=graph_uid, label="Public", visibility="public")
    store.graphs[graph_uid] = Graph(uid=graph_uid, label="Public", visibility="public")
    client = _build_client(store, user_uid="viewer")

    response = client.get(f"/boards/{graph_uid}")

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "success"
    assert payload["data"]["graph"]["uid"] == graph_uid


def test_non_member_write_denied_even_when_public():
    """Non-member should still be denied on write route."""
    store = _FakeGraphStore()
    graph_uid = "g-public"
    store.metadata[graph_uid] = Graph(uid=graph_uid, label="Public", visibility="public")
    client = _build_client(store, user_uid="viewer")

    response = client.patch(f"/boards/{graph_uid}/visibility", json={"visibility": "private"})

    assert response.status_code == 404
    payload = response.json()
    assert payload["detail"] == "Board not found"


def test_member_can_update_visibility():
    """Owner/member should update board visibility successfully."""
    store = _FakeGraphStore()
    graph_uid = "g-public"
    user_uid = "owner-1"
    store.roles[(graph_uid, user_uid)] = "owner"
    store.metadata[graph_uid] = Graph(uid=graph_uid, label="Public", visibility="private")
    client = _build_client(store, user_uid=user_uid)

    response = client.patch(f"/boards/{graph_uid}/visibility", json={"visibility": "public"})

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "success"
    assert payload["data"]["message"] == "Board visibility updated successfully"
    assert store.updated == [(graph_uid, {"visibility": "public"})]
