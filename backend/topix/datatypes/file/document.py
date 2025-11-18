"""Classes representing a document object with properties and content."""

from typing import Literal

from pydantic import Field

from topix.datatypes.property import (
    DataProperty,
    NumberProperty,
    PositionProperty,
    SizeProperty,
    TextProperty,
    URLProperty,
)
from topix.datatypes.resource import Resource, ResourceProperties


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
    number_of_pages: NumberProperty = Field(
        default_factory=lambda: NumberProperty(number=0)
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

    def to_embeddable(self) -> dict[str, str]:
        """Convert the chunk to a string that can be embedded in a vector database."""
        embeddable = super().to_embeddable()
        if self.properties.number_of_pages:
            embeddable["number_of_pages"] = str(self.properties.number_of_pages.number)
        return embeddable
