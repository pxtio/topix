from pydantic import BaseModel
from topix.datatypes.graph.style import Style
from topix.datatypes.note.note import Note


class NodeData(BaseModel):
    note: Note | None = None
    style: Style | None = None
