from pydantic import BaseModel, Field

from topix.datatypes.graph.edge import EdgeData
from topix.datatypes.graph.node import NodeData
from topix.utils.common import gen_uid


class Position(BaseModel):
    x: float
    y: float


class Node(BaseModel):
    id: str
    data: NodeData
    position: Position
    type: str | None = None


class Edge(BaseModel):
    id: str
    source: str
    target: str
    data: EdgeData | None = None
    type: str | None = None


class Graph(BaseModel):
    uid: str = Field(default_factory=lambda: f"graph_{gen_uid()}")
    type: str = "graph"
    label: str | None = None

    nodes: list[Node]
    edges: list[Edge]
