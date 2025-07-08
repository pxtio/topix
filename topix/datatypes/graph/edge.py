from pydantic import BaseModel

from topix.datatypes.graph.style import Style


class EdgeData(BaseModel):
    label: str | None = None
    style: Style
