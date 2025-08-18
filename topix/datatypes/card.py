"""Base class for resources."""

from datetime import datetime

from pydantic import BaseModel, Field

from topix.datatypes.property import Prop


class Card(BaseModel):
    """Base class for notes, documents, etc..."""

    type: str
    id: str

    properties: dict[str, Prop] = Field(default_factory=dict)

    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str | None = None
    deleted_at: str | None = None
