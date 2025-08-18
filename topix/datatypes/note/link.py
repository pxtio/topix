"""Class representing the data for an edge in a graph."""

from pydantic import Field
from typing_extensions import Literal

from topix.datatypes.card import Card
from topix.datatypes.graph.style import Style
from topix.utils.common import gen_uid


class Link(Card):
    """Data for a link in a graph."""

    id: str = Field(default_factory=gen_uid)
    type: Literal["link"] = "link"
    version: int = 1

    source: str
    target: str
    label: str | None = None
    style: Style = Field(default_factory=Style)

    graph_uid: str | None = None
