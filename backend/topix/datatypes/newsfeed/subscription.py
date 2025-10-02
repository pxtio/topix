"""Subscription datatype."""
from enum import StrEnum

from pydantic import Field

from topix.datatypes.property import BooleanProperty, DataProperty, IconProperty, MultiTextProperty, TextProperty
from topix.datatypes.resource import Resource, ResourceProperties, RichText


class Recurrence(StrEnum):
    """Recurrence enum."""

    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    YEARLY = "yearly"


class SubscriptionProperties(ResourceProperties):
    """Properties for a subscription."""

    __pydantic_extra__: dict[str, DataProperty] = Field(init=False)

    raw_description: TextProperty = Field(
        default_factory=lambda: TextProperty()
    )

    emoji: IconProperty = Field(
        default_factory=lambda: IconProperty()
    )

    sub_topics: MultiTextProperty = Field(
        default_factory=lambda: MultiTextProperty()
    )

    description: TextProperty = Field(
        default_factory=lambda: TextProperty()
    )

    keywords: MultiTextProperty = Field(
        default_factory=lambda: MultiTextProperty()
    )

    seed_sources: MultiTextProperty = Field(
        default_factory=lambda: MultiTextProperty()
    )

    recurrence: TextProperty = Field(
        default_factory=lambda: TextProperty()
    )

    collection_running: BooleanProperty = Field(
        default_factory=lambda: BooleanProperty(default=False)
    )


class Subscription(Resource):
    """Subscription object."""

    type: str = "subscription"

    # properties
    properties: SubscriptionProperties = Field(
        default_factory=SubscriptionProperties
    )

    label: RichText

    user_uid: str | None = None  # user who created the subscription
