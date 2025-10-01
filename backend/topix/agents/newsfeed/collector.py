"""Newsfeed agent."""
from __future__ import annotations

from datetime import datetime

from agents import ModelSettings, Tool

from topix.agents.base import BaseAgent
from topix.agents.datatypes.model_enum import ModelEnum
from topix.agents.newsfeed.config import NewsfeedCollectorConfig, NewsfeedSynthesizerConfig
from topix.agents.newsfeed.context import NewsfeedContext
from topix.agents.websearch.handler import WebSearchHandler
from topix.datatypes.newsfeed.subscription import Subscription


class NewsfeedCollector(BaseAgent):
    """Agent that collects news articles from various sources."""

    def __init__(
        self,
        model: str = ModelEnum.OpenAI.GPT_4_1,
        instructions_template: str = "newsfeed/collector.system.jinja",
        model_settings: ModelSettings | None = None,
        web_search: Tool | None = None
    ):
        """Init method."""
        name = "Newsfeed Collector"
        instructions = self._render_prompt(
            instructions_template,
            time=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        )

        if not web_search:
            web_search = WebSearchHandler.get_openai_web_tool()

        super().__init__(
            name=name,
            model=model,
            model_settings=model_settings,
            instructions=instructions,
            tools=[web_search],
        )
        super().__post_init__()

    @classmethod
    def from_config(cls, config: NewsfeedCollectorConfig) -> NewsfeedCollector:
        """Create an instance of NewsfeedCollector from configuration."""
        web_search = WebSearchHandler.from_config(config.web_search)

        return cls(
            model=config.model,
            instructions_template=config.instructions_template,
            model_settings=config.model_settings,
            web_search=web_search
        )

    async def _input_formatter(
        self,
        context,
        input: Subscription,
    ):
        """Format input for the agent."""
        sub_topics_str = '\n'.join(f"- {st}" for st in input.properties.sub_topics.texts) if input.properties.sub_topics.texts else "None"
        keywords_str = ', '.join(kw for kw in input.properties.keywords.texts) if input.properties.keywords.texts else "None"
        seed_sources_str = '\n'.join(f"- {ss}" for ss in input.properties.seed_sources.texts) if input.properties.seed_sources.texts else "None"
        return self._render_prompt(
            "newsfeed/collector.user.jinja",
            topic=input.label.markdown,
            sub_topics=sub_topics_str,
            description=input.properties.description.text,
            keywords=keywords_str,
            seed_sources=seed_sources_str
        )


class NewsfeedSynthesizer(BaseAgent):
    """Agent that picks the best sources for a newsfeed."""

    def __init__(
        self,
        model: str = ModelEnum.OpenAI.GPT_4_1,
        instructions_template: str = "newsfeed/synthesizer.system.jinja",
        model_settings: ModelSettings | None = None,
    ):
        """Init method."""
        name = "Newsfeed Source Picker"
        instructions = self._render_prompt(
            instructions_template,
            time=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        )

        super().__init__(
            name=name,
            model=model,
            model_settings=model_settings,
            instructions=instructions,
            tools=[],
        )
        super().__post_init__()

    @classmethod
    def from_config(cls, config: NewsfeedSynthesizerConfig) -> NewsfeedSynthesizer:
        """Create an instance of NewsfeedSynthesizer from configuration."""
        return cls(
            model=config.model,
            instructions_template=config.instructions_template,
            model_settings=config.model_settings,
        )

    async def _input_formatter(
        self,
        context: NewsfeedContext,
        input: Subscription
    ):
        """Format input for the agent."""
        sub_topics_str = '\n'.join(f"- {st}" for st in input.properties.sub_topics.texts) if input.properties.sub_topics.texts else "None"
        keywords_str = ', '.join(kw for kw in input.properties.keywords.texts) if input.properties.keywords.texts else "None"
        seed_sources_str = '\n'.join(f"- {ss}" for ss in input.properties.seed_sources.texts) if input.properties.seed_sources.texts else "None"
        return self._render_prompt(
            "newsfeed/synthesizer.user.jinja",
            time=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            topic=input.label.markdown,
            sub_topics=sub_topics_str,
            description=input.properties.description.text,
            keywords=keywords_str,
            seed_sources=seed_sources_str,
            items='\n\n---\n\n'.join([
                str(tool_call.output) for tool_call in context.tool_calls
            ])
        )
