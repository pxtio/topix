"""Integration tests for note revision snapshot retention."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest

from topix.datatypes.note.note import Note
from topix.datatypes.resource import RichText
from topix.store.note_revision import NoteRevisionStore, compute_snapshot_hash, serialize_note_snapshot
from topix.store.postgres.note_revision import list_note_revisions
from topix.store.postgres.pool import create_pool


@pytest.mark.asyncio
async def test_note_revision_store_merges_and_prunes(conn):
    """Keep only the latest snapshot inside the merge window and prune old rows."""
    pool = await create_pool()
    store = NoteRevisionStore(
        pool,
        max_snapshots_per_note=2,
        merge_window=timedelta(hours=6),
    )
    await store.ensure_table()
    await conn.execute("DELETE FROM note_revisions WHERE note_id = $1", "note-revision-test")

    base_note = Note(
        id="note-revision-test",
        graph_uid="graph-revision-test",
        label=RichText(markdown="Initial"),
        content=RichText(markdown="alpha"),
    )

    try:
        await store.save_note_snapshot(base_note, user_uid="root")
        revisions = await list_note_revisions(conn, base_note.id)
        assert len(revisions) == 1
        assert revisions[0].snapshot_hash == compute_snapshot_hash(serialize_note_snapshot(base_note))

        updated_note = base_note.model_copy(deep=True)
        updated_note.content = RichText(markdown="beta")
        await store.save_note_snapshot(updated_note, user_uid="root")

        revisions = await list_note_revisions(conn, base_note.id)
        assert len(revisions) == 1
        assert revisions[0].snapshot_hash == compute_snapshot_hash(serialize_note_snapshot(updated_note))

        await conn.execute(
            "UPDATE note_revisions SET created_at = $2 WHERE id = $1",
            revisions[0].id,
            datetime.now(UTC) - timedelta(hours=7),
        )

        third_note = updated_note.model_copy(deep=True)
        third_note.content = RichText(markdown="gamma")
        await store.save_note_snapshot(third_note, user_uid="root")

        revisions = await list_note_revisions(conn, base_note.id)
        assert len(revisions) == 2

        await conn.execute(
            "UPDATE note_revisions SET created_at = $2 WHERE note_id = $1",
            base_note.id,
            datetime.now(UTC) - timedelta(hours=7),
        )

        fourth_note = third_note.model_copy(deep=True)
        fourth_note.content = RichText(markdown="delta")
        await store.save_note_snapshot(fourth_note, user_uid="root")

        revisions = await list_note_revisions(conn, base_note.id)
        assert len(revisions) == 2
        hashes = [revision.snapshot_hash for revision in revisions]
        assert compute_snapshot_hash(serialize_note_snapshot(fourth_note)) in hashes
    finally:
        await conn.execute("DELETE FROM note_revisions WHERE note_id = $1", base_note.id)
        await pool.close()
