"""Class representing the data for a node in a graph."""

from pydantic import BaseModel

from topix.datatypes.graph.style import Style
from topix.datatypes.note.note import Note


class NodeData(BaseModel):
    """Data for a node in a graph."""

    note: Note | None = None
    style: Style | None = None
