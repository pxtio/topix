"""Store for managing subscriptions."""

from topix.agents.newsfeed.pipeline import NewsfeedPipeline
from topix.datatypes.newsfeed.newsfeed import Newsfeed
from topix.datatypes.newsfeed.subscription import Subscription
from topix.store.qdrant.store import ContentStore


class SubscriptionStore:
    """Store for managing subscriptions."""

    def __init__(self):
        """Initialize the subscription store."""
        self._content_store = ContentStore.from_config()
        self._newsfeed_pipeline: NewsfeedPipeline = NewsfeedPipeline.from_config()

    async def create_subscription(self, user_uid: str, topic: str, raw_description: str = "") -> Subscription:
        """Create a new subscription."""
        sub = await self._newsfeed_pipeline.create_subscription(topic, raw_description)
        sub.user_uid = user_uid
        await self._content_store.add([sub])
        return sub

    async def get_subscriptions(self, ids: list[str]) -> Subscription | None:
        """Retrieve a subscription by its UID."""
        return await self._content_store.get(ids=ids)

    async def list_subscriptions(self, user_uid: str, limit: int = 100) -> list[Subscription]:
        """List all subscriptions for a user."""
        results = await self._content_store.filt(
            filters={
                "must": [
                    {
                        "key": "type",
                        "match": {"value": "subscription"}
                    },
                    {
                        "key": "user_uid",
                        "match": {"value": user_uid}
                    }
                ]
            },
            limit=100  # arbitrary large limit
        )
        return results or []

    async def update_subscription(self, subscription_id: str, data: dict):
        """Update an existing subscription."""
        data["id"] = subscription_id
        await self._content_store.update([data])

    async def delete_subscription(self, subscription_id: str, hard_delete: bool = True):
        """Delete a subscription by its UID."""
        await self._content_store.delete([subscription_id], hard_delete=hard_delete)

    async def create_newsfeed(self, subscription: Subscription) -> Newsfeed:
        """Create a new newsfeed for a subscription."""
        newsfeed = await self._newsfeed_pipeline.collect_and_synthesize(subscription)
        await self._content_store.add([newsfeed])
        return newsfeed

    async def get_newsfeeds(self, ids: list[str]) -> list[Newsfeed] | None:
        """Retrieve newsfeeds by their UIDs."""
        return await self._content_store.get(ids=ids)

    async def list_newsfeeds(self, subscription_id: str, limit: int = 100) -> list[Newsfeed]:
        """List all newsfeeds for a subscription."""
        results = await self._content_store.filt(
            filters={
                "must": [
                    {
                        "key": "type",
                        "match": {"value": "newsfeed"}
                    },
                    {
                        "key": "subscription_id",
                        "match": {"value": subscription_id}
                    }
                ]
            },
            limit=limit  # arbitrary large limit
        )
        return results or []

    async def delete_newsfeed(self, newsfeed_id: str, hard_delete: bool = True):
        """Delete a newsfeed by its UID."""
        await self._content_store.delete([newsfeed_id], hard_delete=hard_delete)
