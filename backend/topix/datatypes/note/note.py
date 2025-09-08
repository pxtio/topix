"""Classes representing a note object with properties and content."""

from typing import Literal

from pydantic import Field

from topix.datatypes.graph.style import Style
from topix.datatypes.property import (
    DataProperty,
    IconProperty,
    PositionProperty,
    SizeProperty,
)
from topix.datatypes.resource import Resource


class Note(Resource):
    """Note object."""

    type: Literal["note"] = "note"

    # properties
    properties: dict[str, DataProperty] | None = {
        "node_position": PositionProperty(
            position=PositionProperty.Position(x=0, y=0)
        ),
        "node_size": SizeProperty(
            size=SizeProperty.Size(width=300, height=100)
        ),
        "emoji": IconProperty(
            icon=IconProperty.Emoji(emoji="")
        )
    }

    # graph attributes
    graph_uid: str | None = None
    style: Style = Field(default_factory=Style)

    pinned: bool = False
