"""Unit tests for note revision snapshot helpers."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

import pytest
import zstandard as zstd

from topix.datatypes.note.note import Note
from topix.datatypes.resource import RichText
from topix.store import note_revision as note_revision_module
from topix.store.note_revision import (
    NoteRevisionStore,
    compress_snapshot,
    compute_snapshot_hash,
    serialize_note_snapshot,
)


@dataclass(slots=True)
class _DummyAcquire:
    """Async context manager that yields a fake connection."""

    conn: object

    async def __aenter__(self) -> object:
        return self.conn

    async def __aexit__(self, exc_type, exc, tb) -> None:
        return None


class _DummyPool:
    """Minimal asyncpg-pool stand-in for unit tests."""

    def __init__(self) -> None:
        self.conn = object()

    def acquire(self) -> _DummyAcquire:
        return _DummyAcquire(self.conn)


def _build_note() -> Note:
    """Create a representative note for snapshot tests."""
    return Note(
        id="note-revision-unit",
        graph_uid="graph-unit",
        label=RichText(markdown="Unit"),
        content=RichText(markdown="payload"),
    )


def test_serialize_note_snapshot_is_deterministic() -> None:
    """Serializing the same note twice should yield identical bytes."""
    note = _build_note()

    first = serialize_note_snapshot(note)
    second = serialize_note_snapshot(note.model_copy(deep=True))

    assert first == second
    assert compute_snapshot_hash(first) == compute_snapshot_hash(second)


def test_compress_snapshot_round_trips_with_zstd() -> None:
    """Compressed snapshots should round-trip through zstd decompression."""
    snapshot = serialize_note_snapshot(_build_note())

    compression, compressed = compress_snapshot(snapshot)
    restored = zstd.ZstdDecompressor().decompress(compressed)

    assert compression == "zstd"
    assert restored == snapshot


@pytest.mark.asyncio
async def test_save_note_snapshot_skips_duplicate_latest(monkeypatch) -> None:
    """Duplicate snapshots should not write a new revision row."""
    note = _build_note()
    snapshot = serialize_note_snapshot(note)
    snapshot_hash = compute_snapshot_hash(snapshot)
    pool = _DummyPool()
    store = NoteRevisionStore(pool)
    calls: list[str] = []

    async def fake_get_latest(conn, note_id):
        assert conn is pool.conn
        assert note_id == note.id
        return type(
            "LatestRevision",
            (),
            {
                "id": "rev-1",
                "created_at": datetime.now(UTC),
                "snapshot_hash": snapshot_hash,
            },
        )()

    async def fake_insert(*args, **kwargs):
        calls.append("insert")

    async def fake_replace(*args, **kwargs):
        calls.append("replace")

    async def fake_prune(*args, **kwargs):
        calls.append("prune")

    monkeypatch.setattr(note_revision_module, "get_latest_note_revision", fake_get_latest)
    monkeypatch.setattr(note_revision_module, "insert_note_revision", fake_insert)
    monkeypatch.setattr(note_revision_module, "replace_note_revision", fake_replace)
    monkeypatch.setattr(note_revision_module, "prune_note_revisions", fake_prune)

    await store.save_note_snapshot(note, user_uid="root")

    assert calls == []


@pytest.mark.asyncio
async def test_save_note_snapshot_replaces_within_merge_window(monkeypatch) -> None:
    """Recent snapshots should be replaced in place instead of inserted."""
    note = _build_note()
    note.content = RichText(markdown="updated")
    pool = _DummyPool()
    store = NoteRevisionStore(pool, merge_window=timedelta(hours=6))
    calls: list[str] = []

    async def fake_get_latest(conn, note_id):
        return type(
            "LatestRevision",
            (),
            {
                "id": "rev-1",
                "created_at": datetime.now(UTC) - timedelta(minutes=30),
                "snapshot_hash": "old-hash",
            },
        )()

    async def fake_insert(*args, **kwargs):
        calls.append("insert")

    async def fake_replace(*args, **kwargs):
        calls.append("replace")

    async def fake_prune(*args, **kwargs):
        calls.append("prune")

    monkeypatch.setattr(note_revision_module, "get_latest_note_revision", fake_get_latest)
    monkeypatch.setattr(note_revision_module, "insert_note_revision", fake_insert)
    monkeypatch.setattr(note_revision_module, "replace_note_revision", fake_replace)
    monkeypatch.setattr(note_revision_module, "prune_note_revisions", fake_prune)

    await store.save_note_snapshot(note, user_uid="root")

    assert calls == ["replace", "prune"]


@pytest.mark.asyncio
async def test_save_note_snapshot_inserts_when_latest_is_old(monkeypatch) -> None:
    """Old snapshots should create a fresh revision row."""
    note = _build_note()
    note.content = RichText(markdown="updated")
    pool = _DummyPool()
    store = NoteRevisionStore(pool, merge_window=timedelta(hours=6))
    calls: list[str] = []

    async def fake_get_latest(conn, note_id):
        return type(
            "LatestRevision",
            (),
            {
                "id": "rev-1",
                "created_at": datetime.now(UTC) - timedelta(hours=7),
                "snapshot_hash": "old-hash",
            },
        )()

    async def fake_insert(*args, **kwargs):
        calls.append("insert")

    async def fake_replace(*args, **kwargs):
        calls.append("replace")

    async def fake_prune(*args, **kwargs):
        calls.append("prune")

    monkeypatch.setattr(note_revision_module, "get_latest_note_revision", fake_get_latest)
    monkeypatch.setattr(note_revision_module, "insert_note_revision", fake_insert)
    monkeypatch.setattr(note_revision_module, "replace_note_revision", fake_replace)
    monkeypatch.setattr(note_revision_module, "prune_note_revisions", fake_prune)

    await store.save_note_snapshot(note, user_uid="root")

    assert calls == ["insert", "prune"]
