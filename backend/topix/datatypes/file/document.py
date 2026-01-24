"""Classes representing a document object with properties and content."""

from enum import StrEnum
from typing import Literal

from pydantic import Field, field_validator

from topix.datatypes.note.note import Note, NoteProperties
from topix.datatypes.property import (
    DataProperty,
    KeywordProperty,
    TextProperty,
)


class DocumentStatusEnum(StrEnum):
    """Status enum."""

    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class DocumentStatusProperty(KeywordProperty):
    """Property for document analysis status."""

    value: DocumentStatusEnum | None = None

    @field_validator("value", mode="before")
    @classmethod
    def validate_value(cls, v: DocumentStatusEnum | str | None) -> DocumentStatusEnum | None:
        """Ensure status values are valid DocumentStatusEnum entries."""
        if v is None:
            return None
        if isinstance(v, DocumentStatusEnum):
            return v
        return DocumentStatusEnum(v)


class DocumentProperties(NoteProperties):
    """Document properties."""

    # need to repeat this for every subclass of ResourceProperties
    # otherwise pydantic gets confused
    __pydantic_extra__: dict[str, DataProperty] = Field(init=False)

    mime_type: TextProperty = Field(
        default_factory=lambda: TextProperty(text="application/pdf")
    )
    status: DocumentStatusProperty = Field(
        default_factory=lambda: DocumentStatusProperty()
    )
    summary: TextProperty = Field(
        default_factory=lambda: TextProperty()
    )


class Document(Note):
    """Document object."""

    type: Literal["document"] = "document"

    # properties
    properties: DocumentProperties = Field(
        default_factory=DocumentProperties
    )
