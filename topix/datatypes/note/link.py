"""Class representing the data for an edge in a graph."""

from datetime import datetime

from pydantic import BaseModel, Field
from typing_extensions import Literal

from topix.datatypes.graph.style import Style
from topix.utils.common import gen_uid


class Link(BaseModel):
    """Data for a link in a graph."""

    id: str = Field(default_factory=gen_uid)
    type: Literal["link"] = "link"
    version: int = 1

    source: str
    target: str
    label: str | None = None
    style: Style = Field(default_factory=Style)

    created_at: str | None = Field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str | None = None
    deleted_at: str | None = None

    graph_uid: str
