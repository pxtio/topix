"""Store for managing subscriptions."""

from topix.agents.newsfeed.config import NewsfeedPipelineConfig
from topix.agents.newsfeed.pipeline import NewsfeedPipeline
from topix.datatypes.newsfeed.newsfeed import Newsfeed
from topix.datatypes.newsfeed.subscription import Subscription
from topix.store.qdrant.store import ContentStore


class SubscriptionStore:
    """Store for managing subscriptions."""

    def __init__(self):
        """Initialize the subscription store."""
        self._content_store = ContentStore.from_config()
        self._newsfeed_pipeline: NewsfeedPipeline = NewsfeedPipeline.from_config(
            NewsfeedPipelineConfig.from_yaml(),
            content_store=self._content_store
        )

    async def open(self):
        """Open the subscription store."""
        pass

    async def create_subscription(
        self,
        user_uid: str,
        topic: str,
        raw_description: str = "",
        uid: str | None = None,
    ) -> Subscription:
        """Create a new subscription."""
        sub = await self._newsfeed_pipeline.create_subscription(topic, raw_description)
        sub.user_uid = user_uid
        if uid:
            sub.id = uid
        await self._content_store.add([sub])
        return sub

    async def get_subscriptions(self, ids: list[str]) -> list[Subscription]:
        """Retrieve a subscription by its UID."""
        points = await self._content_store.get(ids=ids)
        return [point.resource for point in points]

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
            include=True,
            limit=100  # arbitrary large limit
        )
        return [result.resource for result in results] if results else []

    async def update_subscription(self, subscription_id: str, data: dict):
        """Update an existing subscription."""
        data["id"] = subscription_id
        await self._content_store.update([data])

    async def delete_subscription(self, subscription_id: str, hard_delete: bool = True):
        """Delete a subscription by its UID."""
        await self._content_store.delete([subscription_id], hard_delete=hard_delete)

    async def create_newsfeed(
        self,
        subscription: Subscription | str,
        uid: str | None = None
    ) -> Newsfeed:
        """Create a new newsfeed for a subscription."""
        if isinstance(subscription, str):
            subscription = (await self.get_subscriptions([subscription]))[0]

        history = await self.list_newsfeeds(subscription.id, limit=30)
        newsfeed = await self._newsfeed_pipeline.collect_and_synthesize(subscription, history=history)
        if uid:
            newsfeed.id = uid
        await self._content_store.add([newsfeed])
        return newsfeed

    async def get_newsfeeds(self, ids: list[str]) -> list[Newsfeed] | None:
        """Retrieve newsfeeds by their UIDs."""
        points = await self._content_store.get(ids=ids)
        return [point.resource for point in points] if points else None

    async def update_newsfeed(self, newsfeed_id: str, data: dict):
        """Update an existing newsfeed."""
        data["id"] = newsfeed_id
        await self._content_store.update([data])

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
            include=True,
            limit=limit  # arbitrary large limit
        )
        return [result.resource for result in results] if results else []

    async def delete_newsfeed(self, newsfeed_id: str, hard_delete: bool = True):
        """Delete a newsfeed by its UID."""
        await self._content_store.delete([newsfeed_id], hard_delete=hard_delete)

    async def close(self):
        """Close the subscription store."""
        await self._content_store.close()
