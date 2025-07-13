"""Classes representing a graph structure with nodes and edges."""

from datetime import datetime
from pydantic import BaseModel, Field

from topix.datatypes.graph.edge import EdgeData
from topix.datatypes.graph.node import NodeData
from topix.utils.common import gen_uid


class Position(BaseModel):
    """Position of a node in the graph."""

    x: float
    y: float


class Node(BaseModel):
    """Node in a graph."""

    id: str
    data: NodeData
    position: Position
    type: str | None = None


class Edge(BaseModel):
    """Edge in a graph."""

    id: str
    source: str
    target: str
    data: EdgeData | None = None
    type: str | None = None


class Graph(BaseModel):
    """Graph object containing nodes and edges."""

    id: int
    uid: str = Field(default_factory=lambda: f"graph_{gen_uid()}")
    type: str = "graph"
    label: str | None = None

    nodes: list[Node] = Field(default_factory=list)
    edges: list[Edge] = Field(default_factory=list)

    format_version: int = 1
    readonly: bool = False

    created_at: str | None = Field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str | None = None
    deleted_at: str | None = None
