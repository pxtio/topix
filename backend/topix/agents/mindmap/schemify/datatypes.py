"""Schemify datatypes."""
from pydantic import BaseModel


class SNode(BaseModel):
    """Schemify Node."""

    id: str
    label: str


class SEdge(BaseModel):
    """Schemify Edge."""

    source: str
    target: str
    label: str | None = None


class SchemaOutput(BaseModel):
    """Schemify Output."""

    nodes: list[SNode]
    edges: list[SEdge]
