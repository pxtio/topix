"""Classes representing a graph structure with nodes and edges."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from topix.datatypes.note.link import Link
from topix.datatypes.note.note import Note
from topix.utils.common import gen_uid


class Graph(BaseModel):
    """Graph object containing nodes and edges."""

    id: int | None = None
    uid: str = Field(default_factory=gen_uid)
    type: Literal["graph"] = "graph"
    label: str | None = None

    nodes: list[Note] = []
    edges: list[Link] = []

    format_version: int = 1
    readonly: bool = False

    created_at: str | None = Field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str | None = None
    deleted_at: str | None = None
