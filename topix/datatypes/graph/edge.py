"""Class representing the data for an edge in a graph."""

from pydantic import BaseModel

from topix.datatypes.graph.style import Style


class EdgeData(BaseModel):
    """Data for an edge in a graph."""

    label: str | None = None
    style: Style
