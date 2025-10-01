"""Newsfeed pipeline."""
from __future__ import annotations

from topix.agents.newsfeed.collector import NewsfeedCollector, NewsfeedSynthesizer
from topix.agents.newsfeed.config import NewsfeedPipelineConfig
from topix.agents.newsfeed.context import NewsfeedContext
from topix.agents.newsfeed.topic_setup import Topic, TopicSetup, TopicSetupInput
from topix.agents.run import AgentRunner
from topix.datatypes.newsfeed.newsfeed import Newsfeed
from topix.datatypes.newsfeed.subscription import Subscription, SubscriptionProperties
from topix.datatypes.property import MultiTextProperty, TextProperty
from topix.datatypes.resource import RichText
from topix.store.qdrant.store import ContentStore


class NewsfeedPipeline:
    """Newsfeed pipeline."""

    def __init__(
        self,
        topic_setup: TopicSetup | None = None,
        collector: NewsfeedCollector | None = None,
        synthesizer: NewsfeedSynthesizer | None = None,
        content_store: ContentStore | None = None
    ):
        """Init method."""
        self.content_store = content_store or ContentStore.from_config()
        self.topic_setup = topic_setup or TopicSetup()
        self.collector = collector or NewsfeedCollector()
        self.synthesizer = synthesizer or NewsfeedSynthesizer()

    @classmethod
    def from_config(cls, config: NewsfeedPipelineConfig, content_store: ContentStore | None = None) -> NewsfeedPipeline:
        """Create an instance of NewsfeedPipeline from configuration."""
        topic_setup = TopicSetup.from_config(config.topic_setup)
        collector = NewsfeedCollector.from_config(config.collector)
        synthesizer = NewsfeedSynthesizer.from_config(config.synthesizer)

        return cls(topic_setup, collector, synthesizer, content_store)

    @staticmethod
    def _convert_topic_to_subscription(label: str, raw_description: str, topic: Topic) -> Subscription:
        """Convert Topic to Subscription."""
        return Subscription(
            label=RichText(markdown=label),
            properties=SubscriptionProperties(
                raw_description=TextProperty(text=raw_description),
                description=TextProperty(text=topic.description),
                sub_topics=MultiTextProperty(texts=topic.sub_topics),
                keywords=MultiTextProperty(texts=topic.keywords),
                seed_sources=MultiTextProperty(texts=topic.seed_sources)
            )
        )

    async def create_subscription(self, topic: str, raw_description: str = "") -> Subscription:
        """Run the newsfeed pipeline."""
        topic_obj = await AgentRunner.run(
            self.topic_setup,
            TopicSetupInput(topic=topic, raw_description=raw_description)
        )
        return self._convert_topic_to_subscription(
            label=topic,
            raw_description=raw_description,
            topic=topic_obj
        )

    async def collect_and_synthesize(self, subscription: Subscription) -> Newsfeed:
        """Collect and synthesize newsfeed items."""
        context = NewsfeedContext()
        _ = await AgentRunner.run(
            self.collector,
            input=subscription,
            context=context
        )
        summary = await AgentRunner.run(
            self.synthesizer,
            input=subscription,
            context=context
        )
        return Newsfeed(content=RichText(markdown=summary), subscription_id=subscription.id)
