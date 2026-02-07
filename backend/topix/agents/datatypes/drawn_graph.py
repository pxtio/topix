"""Datatypes for drawify agent output."""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel


class DrawnNode(BaseModel):
    """A node in a drawn graph."""

    id: str
    type: Literal["rectangle", "ellipse", "diamond", "text"]
    label: str | None = None
    background: str | None = None
    border: str | None = None
    font_size: Literal["md", "lg"] = "md"

    x: float
    y: float
    width: float
    height: float


class DrawnEdge(BaseModel):
    """An edge in a drawn graph."""

    source: str
    target: str
    head: Literal["arrow", "none"] = "arrow"
    tail: Literal["arrow", "none"] = "none"
    label: str | None = None


class DrawnGraph(BaseModel):
    """A drawn graph."""

    nodes: list[DrawnNode]
    edges: list[DrawnEdge]
