"""Unit tests for GraphStore note snapshot hooks."""

from __future__ import annotations

import asyncio

from unittest.mock import AsyncMock

import pytest

from topix.datatypes.note.note import Note
from topix.datatypes.resource import RichText
from topix.store.graph import GraphStore
from topix.store.note_revision import compress_snapshot, serialize_note_snapshot


def _build_store() -> GraphStore:
    """Create a GraphStore instance without bootstrapping external config."""
    store = object.__new__(GraphStore)
    store._content_store = AsyncMock()
    store._pg_pool = None
    store._note_revision_store = None
    return store


def _build_note() -> Note:
    """Create a representative note for GraphStore tests."""
    return Note(
        id="graph-store-note",
        graph_uid="graph-store-graph",
        label=RichText(markdown="Before"),
        content=RichText(markdown="content"),
    )


@pytest.mark.asyncio
async def test_update_node_schedules_snapshot_in_background(monkeypatch) -> None:
    """Updating a node should schedule a snapshot task without blocking the write."""
    store = _build_store()
    note = _build_note()
    store.get_nodes = AsyncMock(return_value=[note])
    store._content_store.update = AsyncMock()
    store._note_revision_store = AsyncMock()

    created_tasks: list[asyncio.Task] = []
    original_create_task = asyncio.create_task

    def track_task(coro):
        task = original_create_task(coro)
        created_tasks.append(task)
        return task

    monkeypatch.setattr(asyncio, "create_task", track_task)

    await store.update_node(note.id, {"type": "note", "label": {"markdown": "After"}}, user_uid="root")

    store._content_store.update.assert_awaited_once_with(
        [{"type": "note", "label": {"markdown": "After"}, "id": note.id}]
    )
    assert len(created_tasks) == 1

    await asyncio.gather(*created_tasks)
    store._note_revision_store.save_note_snapshot.assert_awaited_once()
    saved_note = store._note_revision_store.save_note_snapshot.await_args.args[0]
    assert saved_note.id == note.id
    assert saved_note is not note
    assert store._note_revision_store.save_note_snapshot.await_args.kwargs == {"user_uid": "root"}


@pytest.mark.asyncio
async def test_delete_node_snapshots_before_delete(monkeypatch) -> None:
    """Deleting a node should await snapshot persistence before deleting it."""
    store = _build_store()
    note = _build_note()
    store.get_nodes = AsyncMock(return_value=[note])
    store._content_store.delete = AsyncMock()
    store._content_store.delete_by_filters = AsyncMock()
    store._note_revision_store = AsyncMock()
    events: list[str] = []

    async def save_snapshot(*args, **kwargs):
        events.append("snapshot")

    async def delete_node(*args, **kwargs):
        events.append("delete")

    store._note_revision_store.save_note_snapshot.side_effect = save_snapshot
    store._content_store.delete.side_effect = delete_node

    created_tasks: list[asyncio.Task] = []
    original_create_task = asyncio.create_task

    def track_task(coro):
        task = original_create_task(coro)
        created_tasks.append(task)
        return task

    monkeypatch.setattr(asyncio, "create_task", track_task)

    await store.delete_node(note.id, hard_delete=False, user_uid="root")

    assert events[:2] == ["snapshot", "delete"]
    store._note_revision_store.save_note_snapshot.assert_awaited_once_with(note, user_uid="root")
    store._content_store.delete.assert_awaited_once_with([note.id], hard_delete=False)
    assert len(created_tasks) == 1
    await asyncio.gather(*created_tasks)
    store._content_store.delete_by_filters.assert_awaited_once()


@pytest.mark.asyncio
async def test_restore_latest_note_revision_updates_existing_note() -> None:
    """Restoring a note should snapshot the current state and write the full revision payload."""
    store = _build_store()
    current_note = _build_note()
    restored_note = current_note.model_copy(deep=True)
    restored_note.label = RichText(markdown="Restored")
    compression, snapshot_compressed = compress_snapshot(serialize_note_snapshot(restored_note))
    store.get_nodes = AsyncMock(return_value=[current_note])
    store._content_store.update = AsyncMock()
    store._note_revision_store = AsyncMock()
    store._note_revision_store.get_latest_note_revision.return_value = type(
        "LatestRevision",
        (),
        {
            "compression": compression,
            "snapshot_compressed": snapshot_compressed,
        },
    )()

    result = await store.restore_latest_note_revision(current_note.id, user_uid="root")

    assert result is not None
    assert result.label == restored_note.label
    store._note_revision_store.save_note_snapshot.assert_awaited_once_with(current_note, user_uid="root")
    store._content_store.update.assert_awaited_once()
    payload = store._content_store.update.await_args.args[0][0]
    assert payload["id"] == restored_note.id
    assert payload["deleted_at"] is None
    assert payload["label"]["markdown"] == "Restored"


@pytest.mark.asyncio
async def test_restore_latest_note_revision_returns_none_without_snapshot() -> None:
    """Restoring should no-op cleanly when no revision exists yet."""
    store = _build_store()
    store._note_revision_store = AsyncMock()
    store._note_revision_store.get_latest_note_revision.return_value = None
    store.get_nodes = AsyncMock()

    result = await store.restore_latest_note_revision("missing-note", user_uid="root")

    assert result is None
    store.get_nodes.assert_not_called()
