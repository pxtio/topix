"""Unit tests for the boards note restore endpoint."""

from __future__ import annotations

from types import SimpleNamespace

import pytest

from fastapi import Response

from topix.api.router.boards import restore_latest_note_revision
from topix.datatypes.note.note import Note
from topix.datatypes.resource import RichText


class _FakeGraphStore:
    """Minimal async graph store for note restore endpoint tests."""

    def __init__(self) -> None:
        self.restored: Note | None = None
        self.restore_calls: list[tuple[str, str]] = []

    async def restore_latest_note_revision(self, node_id: str, user_uid: str | None = None) -> Note | None:
        self.restore_calls.append((node_id, user_uid or ""))
        return self.restored


@pytest.mark.asyncio
async def test_restore_latest_note_revision_returns_restored_note() -> None:
    """The endpoint should return the restored note payload on success."""
    store = _FakeGraphStore()
    response = Response()
    graph_uid = "graph-restore"
    note_id = "note-restore"
    user_uid = "member-1"
    store.restored = Note(
        id=note_id,
        graph_uid=graph_uid,
        label=RichText(markdown="Restored"),
    )
    request = SimpleNamespace(app=SimpleNamespace(graph_store=store))

    payload = await restore_latest_note_revision(
        response=response,
        request=request,
        graph_id=graph_uid,
        note_id=note_id,
        user_id=user_uid,
        _=None,
    )

    assert response.status_code == 200
    assert payload["status"] == "success"
    assert payload["data"]["note"]["id"] == note_id
    assert payload["data"]["note"]["label"]["markdown"] == "Restored"
    assert store.restore_calls == [(note_id, user_uid)]


@pytest.mark.asyncio
async def test_restore_latest_note_revision_returns_not_found_without_snapshot() -> None:
    """The endpoint should return a 404-style error when no revision exists."""
    store = _FakeGraphStore()
    response = Response()
    graph_uid = "graph-restore"
    note_id = "note-restore"
    user_uid = "member-1"
    request = SimpleNamespace(app=SimpleNamespace(graph_store=store))

    payload = await restore_latest_note_revision(
        response=response,
        request=request,
        graph_id=graph_uid,
        note_id=note_id,
        user_id=user_uid,
        _=None,
    )

    assert response.status_code == 404
    assert payload["status"] == "error"
    assert payload["data"]["message"] == "Note revision not found"
