"""Base class for resources."""

from datetime import datetime

from pydantic import BaseModel, Field

from topix.datatypes.property import DataProperty
from topix.utils.common import gen_uid


class RichText(BaseModel):
    """Rich text object."""

    markdown: str
    searchable: bool = True


class Resource(BaseModel):
    """Base class for notes, documents, etc..."""

    type: str
    id: str = Field(default_factory=gen_uid)
    version: int = 1

    # properties
    properties: dict[str, DataProperty] = {}

    # content
    label: RichText | None = None
    content: RichText | None = None

    # datetime
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str | None = None
    deleted_at: str | None = None
