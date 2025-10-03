"""NewsFeed datatype."""
from typing import Literal

from pydantic import Field

from topix.datatypes.property import BooleanProperty, DataProperty, MultiSourceProperty
from topix.datatypes.resource import Resource, ResourceProperties, RichText


class NewsfeedProperties(ResourceProperties):
    """Properties for a newsfeed."""

    __pydantic_extra__: dict[str, DataProperty] = Field(init=False)

    news_grid: MultiSourceProperty = Field(
        default_factory=lambda: MultiSourceProperty()
    )

    marked_as_read: BooleanProperty = Field(
        default_factory=lambda: BooleanProperty()
    )


class Newsfeed(Resource):
    """Newsfeed object."""

    type: Literal["newsfeed"] = "newsfeed"

    # properties
    properties: NewsfeedProperties = Field(
        default_factory=NewsfeedProperties
    )

    label: RichText | None = None
    content: RichText

    subscription_id: str
