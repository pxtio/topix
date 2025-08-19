"""Class representing the data for an edge in a graph."""

from pydantic import Field
from typing_extensions import Literal

from topix.datatypes.graph.style import Style
from topix.datatypes.resource import Resource


class Link(Resource):
    """Data for a link in a graph."""

    type: Literal["link"] = "link"

    source: str
    target: str

    style: Style = Field(default_factory=Style)

    graph_uid: str | None = None
