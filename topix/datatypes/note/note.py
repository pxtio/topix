"""Classes representing a note object with properties and content."""

from datetime import datetime

from pydantic import BaseModel, Field

from topix.datatypes.note.property import Property
from topix.utils.common import gen_uid


class Content(BaseModel):
    """Content of a note."""

    markdown: str


class Note(BaseModel):
    """Note object."""

    id: str = Field(default_factory=lambda: f"note_{gen_uid()}")
    type: str = "note"

    created_at: datetime | None = Field(default_factory=datetime.now)
    deleted_at: datetime | None = None

    # properties
    properties: dict[str, Property] | None = None

    # content
    label: str | None = None
    content: Content | None = None
