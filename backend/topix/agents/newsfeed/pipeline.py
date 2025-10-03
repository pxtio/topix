"""Newsfeed pipeline."""
from __future__ import annotations

from topix.agents.datatypes.annotations import SearchResult
from topix.agents.datatypes.outputs import NewsfeedArticle, NewsfeedOutput, TopicTracker
from topix.agents.newsfeed.collector import NewsfeedCollector, NewsfeedSynthesizer
from topix.agents.newsfeed.config import NewsfeedPipelineConfig
from topix.agents.newsfeed.context import NewsfeedContext
from topix.agents.newsfeed.topic_tracker import TopicSetup, TopicSetupInput
from topix.agents.run import AgentRunner
from topix.datatypes.newsfeed.newsfeed import Newsfeed, NewsfeedProperties
from topix.datatypes.newsfeed.subscription import Subscription, SubscriptionProperties
from topix.datatypes.property import MultiSourceProperty, MultiTextProperty, TextProperty
from topix.datatypes.resource import RichText
from topix.store.qdrant.store import ContentStore
from topix.utils.web.favicon import fetch_meta_images_batch


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
    def _convert_topic_to_subscription(label: str, raw_description: str, topic: TopicTracker) -> Subscription:
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
        context = NewsfeedContext()
        topic_obj = await AgentRunner.run(
            self.topic_setup,
            TopicSetupInput(topic=topic, raw_description=raw_description),
            context=context
        )
        return self._convert_topic_to_subscription(
            label=topic,
            raw_description=raw_description,
            topic=topic_obj
        )

    def _convert_newsfeed_output_to_markdown(self, output: NewsfeedOutput) -> str:
        """Convert NewsfeedOutput to markdown string."""
        summary = ""
        for section in output.sections:
            if not section.articles:
                continue
            summary += f"## {section.title}\n\n"
            for article in section.articles:
                summary += f"### [{article.title}]({article.url})\n\n"
                summary += f"{article.summary}\n\n"
        return summary

    def _convert_newsfeed_article_to_search_result(self, article: NewsfeedArticle) -> SearchResult:
        """Convert NewsfeedArticle to SearchResult."""
        return SearchResult(
            title=article.title,
            url=article.url,
            content=article.summary,
            published_at=article.published_at,
            source_domain=article.source_domain
        )

    async def _add_articles_annotations(self, hits: list[SearchResult]) -> list[SearchResult]:
        """Add article annotations to content store."""
        meta_images = await fetch_meta_images_batch(
            [result.url for result in hits]
        )
        for result in hits:
            if result.url not in meta_images:
                continue
            images = meta_images[result.url]
            if images.favicon:
                result.favicon = str(images.favicon) if images.favicon else None
            if images.cover_image:
                result.cover_image = str(images.cover_image) if images.cover_image else None
        return hits

    async def collect_and_synthesize(self, subscription: Subscription) -> Newsfeed:
        """Collect and synthesize newsfeed items."""
        context = NewsfeedContext()
        _ = await AgentRunner.run(
            self.collector,
            input=subscription,
            context=context
        )
        output = await AgentRunner.run(
            self.synthesizer,
            input=subscription,
            context=context
        )
        summary = self._convert_newsfeed_output_to_markdown(output)
        hits = []
        for section in output.sections:
            for article in section.articles:
                hits.append(self._convert_newsfeed_article_to_search_result(article))
        hits = await self._add_articles_annotations(hits)
        return Newsfeed(
            content=RichText(markdown=summary),
            subscription_id=subscription.id,
            properties=NewsfeedProperties(
                news_grid=MultiSourceProperty(
                    sources=hits
                )
            )
        )
