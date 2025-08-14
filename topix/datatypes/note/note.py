"""Classes representing a note object with properties and content."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from topix.datatypes.graph.style import Style
from topix.datatypes.note.property import (
    IconProperty,
    PositionProperty,
    Prop,
    SizeProperty,
)
from topix.utils.common import gen_uid


class Content(BaseModel):
    """Content of a note."""

    markdown: str


class Note(BaseModel):
    """Note object."""

    id: str = Field(default_factory=gen_uid)
    type: Literal["note"] = "note"
    version: int = 1

    created_at: str | None = Field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str | None = None
    deleted_at: str | None = None

    # properties
    properties: dict[str, Prop] | None = {
        "node_position": Prop(
            prop=PositionProperty(
                position=PositionProperty.Position(x=0, y=0)
            )
        ),
        "node_size": Prop(
            prop=SizeProperty(
                size=SizeProperty.Size(width=100, height=100)
            )
        ),
        "emoji": Prop(
            prop=IconProperty(
                icon=IconProperty.Emoji(emoji="")
            )
        )
    }

    # content
    label: str | None = None
    content: Content | None = None

    # graph attributes
    graph_uid: str | None = None
    style: Style = Field(default_factory=Style)
