"""Postgres store helpers for note revision snapshots."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime

import asyncpg


@dataclass(slots=True)
class NoteRevisionRecord:
    """Persisted note revision snapshot metadata and payload."""

    id: str
    note_id: str
    user_uid: str | None
    created_at: datetime
    snapshot_hash: str
    compression: str
    snapshot_compressed: bytes


def _row_to_note_revision(row: asyncpg.Record) -> NoteRevisionRecord:
    """Convert a database row into a note revision record."""
    return NoteRevisionRecord(
        id=row["id"],
        note_id=row["note_id"],
        user_uid=row["user_uid"],
        created_at=row["created_at"],
        snapshot_hash=row["snapshot_hash"],
        compression=row["compression"],
        snapshot_compressed=row["snapshot_compressed"],
    )


async def create_note_revisions_table(conn: asyncpg.Connection) -> None:
    """Create the note revisions table and its index when missing."""
    await conn.execute(
        """
        CREATE TABLE IF NOT EXISTS note_revisions (
            id TEXT PRIMARY KEY,
            note_id TEXT NOT NULL,
            user_uid TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            snapshot_hash TEXT NOT NULL,
            compression TEXT NOT NULL,
            snapshot_compressed BYTEA NOT NULL
        )
        """
    )
    await conn.execute(
        """
        CREATE INDEX IF NOT EXISTS note_revisions_note_id_created_at_idx
        ON note_revisions (note_id, created_at DESC)
        """
    )


async def get_latest_note_revision(
    conn: asyncpg.Connection,
    note_id: str,
) -> NoteRevisionRecord | None:
    """Return the latest revision snapshot for a note."""
    row = await conn.fetchrow(
        """
        SELECT id, note_id, user_uid, created_at, snapshot_hash, compression, snapshot_compressed
        FROM note_revisions
        WHERE note_id = $1
        ORDER BY created_at DESC
        LIMIT 1
        """,
        note_id,
    )
    if row is None:
        return None
    return _row_to_note_revision(row)


async def insert_note_revision(
    conn: asyncpg.Connection,
    revision: NoteRevisionRecord,
) -> None:
    """Insert a new note revision snapshot."""
    await conn.execute(
        """
        INSERT INTO note_revisions (
            id, note_id, user_uid, created_at, snapshot_hash, compression, snapshot_compressed
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        """,
        revision.id,
        revision.note_id,
        revision.user_uid,
        revision.created_at,
        revision.snapshot_hash,
        revision.compression,
        revision.snapshot_compressed,
    )


async def replace_note_revision(
    conn: asyncpg.Connection,
    revision_id: str,
    user_uid: str | None,
    created_at: datetime,
    snapshot_hash: str,
    compression: str,
    snapshot_compressed: bytes,
) -> None:
    """Replace the latest revision when it falls inside the merge window."""
    await conn.execute(
        """
        UPDATE note_revisions
        SET user_uid = $2,
            created_at = $3,
            snapshot_hash = $4,
            compression = $5,
            snapshot_compressed = $6
        WHERE id = $1
        """,
        revision_id,
        user_uid,
        created_at,
        snapshot_hash,
        compression,
        snapshot_compressed,
    )


async def prune_note_revisions(
    conn: asyncpg.Connection,
    note_id: str,
    keep: int,
) -> None:
    """Delete revisions older than the newest ``keep`` snapshots for a note."""
    await conn.execute(
        """
        DELETE FROM note_revisions
        WHERE id IN (
            SELECT id
            FROM note_revisions
            WHERE note_id = $1
            ORDER BY created_at DESC
            OFFSET $2
        )
        """,
        note_id,
        keep,
    )


async def list_note_revisions(
    conn: asyncpg.Connection,
    note_id: str,
) -> list[NoteRevisionRecord]:
    """List all note revisions for a note from newest to oldest."""
    rows = await conn.fetch(
        """
        SELECT id, note_id, user_uid, created_at, snapshot_hash, compression, snapshot_compressed
        FROM note_revisions
        WHERE note_id = $1
        ORDER BY created_at DESC
        """,
        note_id,
    )
    return [_row_to_note_revision(row) for row in rows]


async def delete_note_revision(
    conn: asyncpg.Connection,
    revision_id: str,
) -> None:
    """Delete a stored note revision by its id."""
    await conn.execute(
        """
        DELETE FROM note_revisions
        WHERE id = $1
        """,
        revision_id,
    )
