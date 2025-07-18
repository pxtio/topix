"""Simple mind map data types."""

from __future__ import annotations

from pydantic import BaseModel


class SimpleNode(BaseModel):
    """Represents a single node in the mind map."""

    emoji: str
    label: str
    note: str
    children: list[SimpleNode] = []
