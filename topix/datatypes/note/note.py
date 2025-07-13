"""Classes representing a note object with properties and content."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from topix.datatypes.note.property import Property
from topix.utils.common import gen_uid


class Content(BaseModel):
    """Content of a note."""

    markdown: str


class Note(BaseModel):
    """Note object."""

    id: str = Field(default_factory=gen_uid)
    type: Literal["note"] = "note"

    created_at: str | None = Field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str | None = None
    deleted_at: str | None = None

    # properties
    properties: dict[str, Property] | None = None

    # content
    label: str | None = None
    content: Content | None = None
