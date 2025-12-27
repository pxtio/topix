"""Classes representing a document object with properties and content."""

from enum import StrEnum
from typing import Literal, Type

from pydantic import Field

from topix.datatypes.property import (
    DataProperty,
    KeywordProperty,
    PositionProperty,
    SizeProperty,
    TextProperty,
    URLProperty,
)
from topix.datatypes.resource import Resource, ResourceProperties


class DocumentAnalysisStatusEnum(StrEnum):
    """Status enum."""

    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class DocumentStatusProperty(KeywordProperty):
    """Property for document analysis status."""

    value_type: Type[DocumentAnalysisStatusEnum] = DocumentAnalysisStatusEnum


class DocumentProperties(ResourceProperties):
    """Document properties."""

    # need to repeat this for every subclass of ResourceProperties
    # otherwise pydantic gets confused
    __pydantic_extra__: dict[str, DataProperty] = Field(init=False)

    node_position: PositionProperty = Field(
        default_factory=lambda: PositionProperty(
            position=PositionProperty.Position(x=0, y=0)
        )
    )
    node_size: SizeProperty = Field(
        default_factory=lambda: SizeProperty(
            size=SizeProperty.Size(width=300, height=100)
        )
    )
    url: URLProperty = Field(
        default_factory=lambda: URLProperty()
    )
    mime_type: TextProperty = Field(
        default_factory=lambda: TextProperty(text="application/pdf")
    )
    status: DocumentStatusProperty = Field(
        default_factory=lambda: DocumentStatusProperty()
    )
    summary: TextProperty = Field(
        default_factory=lambda: TextProperty()
    )


class Document(Resource):
    """Document object."""

    type: Literal["document"] = "document"

    # properties
    properties: DocumentProperties = Field(
        default_factory=DocumentProperties
    )

    # graph attributes
    graph_uid: str | None = None
