"""Simple mind map data types."""

from __future__ import annotations

from pydantic import BaseModel


class SimpleNode(BaseModel):
    """Represents a single node in the mind map."""

    level: int
    label: str
    note: str
    emoji: str = ""
    children: list[SimpleNode] = []
