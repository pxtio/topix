"""Classes representing a chunk object with properties and content."""

from typing import Literal

from pydantic import Field

from topix.datatypes.property import (
    DataProperty,
    TextProperty,
)
from topix.datatypes.resource import Resource, ResourceProperties


class ChunkProperties(ResourceProperties):
    """Chunk properties."""

    # need to repeat this for every subclass of ResourceProperties
    # otherwise pydantic gets confused
    __pydantic_extra__: dict[str, DataProperty] = Field(init=False)

    pages: TextProperty = Field(
        default_factory=lambda: TextProperty(text="")
    )
    document_label: TextProperty = Field(
        default_factory=lambda: TextProperty(text="")
    )


class Chunk(Resource):
    """Chunk object."""

    type: Literal["chunk"] = "chunk"

    # properties
    properties: ChunkProperties = Field(
        default_factory=ChunkProperties
    )

    # graph attributes
    graph_uid: str | None = None
    document_uid: str | None = None

    def to_embeddable(self) -> dict[str, str]:
        """Convert the chunk to a string that can be embedded in a vector database."""
        embeddable = super().to_embeddable()
        if self.properties.document_label:
            embeddable["document_label"] = self.properties.document_label.text
        return embeddable
