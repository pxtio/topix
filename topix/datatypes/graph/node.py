from typing import Literal
from pydantic import BaseModel
from topix.datatypes.note.note import Note


class NodeStyle(BaseModel):
    type: str = "rectangle"
    angle: float
    stroke_color: str
    background_color: str
    fill_style: str
    stroke_width: int
    stroke_style: Literal["solid", "dashed"] = "solid"
    roughness: float = 1.0  # Roughness of the node, between 0 and 2
    opacity: int = 100  # Opacity of the node, default is 100%
    group_ids: list[str] = []  # List of group IDs this node belongs to
    font_family: str
    text_align: Literal["left", "center", "right"] = "left"
    color: str | None = None  # Text color, can be None, in that case it will use stroke_color


class NodeData(BaseModel):
    note: Note | None = None
    style: NodeStyle | None = None
