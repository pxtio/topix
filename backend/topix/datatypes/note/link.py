"""Class representing the data for an edge in a graph."""

from pydantic import Field
from typing_extensions import Literal

from topix.datatypes.note.style import LinkStyle
from topix.datatypes.resource import Resource


class Link(Resource):
    """Data for a link in a graph."""

    type: Literal["link"] = "link"

    source: str
    target: str

    style: LinkStyle = Field(default_factory=LinkStyle)

    graph_uid: str | None = None
