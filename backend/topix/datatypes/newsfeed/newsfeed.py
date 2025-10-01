"""NewsFeed datatype."""
from typing import Literal

from pydantic import Field

from topix.datatypes.property import DataProperty, MultiSourceProperty
from topix.datatypes.resource import Resource, ResourceProperties, RichText


class NewsfeedProperties(ResourceProperties):
    """Properties for a newsfeed."""

    __pydantic_extra__: dict[str, DataProperty] = Field(init=False)

    news_grid: MultiSourceProperty = Field(
        default_factory=lambda: MultiSourceProperty()
    )


class Newsfeed(Resource):
    """Newsfeed object."""

    type: Literal["newsfeed"] = "newsfeed"

    # properties
    properties: ResourceProperties = Field(
        default_factory=ResourceProperties
    )

    label: RichText
    content: RichText

    subscription_id: str
