"""Schemify datatypes."""

from typing import Literal

from pydantic import BaseModel


class SNode(BaseModel):
    """Schemify Node."""

    type: Literal["rectangle", "ellipse", "diamond", "image", "icon"]
    id: str
    label: str
    image_url: str | None = None
    icon_name: str | None = None
    x: int
    y: int


class SEdge(BaseModel):
    """Schemify Edge."""

    source: str
    target: str


class SchemaOutput(BaseModel):
    """Schemify Output."""

    nodes: list[SNode]
    edges: list[SEdge]
