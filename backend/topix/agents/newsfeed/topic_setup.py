"""Topic tracker agent."""
from __future__ import annotations

from datetime import datetime

from agents import ModelSettings, Tool
from pydantic import BaseModel

from topix.agents.assistant.websearch.broad import BroadWebSearch
from topix.agents.assistant.websearch.make_tool import make_web_search_tool, make_web_search_tool_from_config
from topix.agents.base import BaseAgent
from topix.agents.datatypes.model_enum import ModelEnum
from topix.agents.newsfeed.config import TopicSetupConfig


class TopicSetupInput(BaseModel):
    """Input data model for TopicSetup agent."""

    topic: str
    raw_description: str = ""


class Topic(BaseModel):
    """Topic data model."""

    description: str
    sub_topics: list[str]
    keywords: list[str]
    seed_sources: list[str]


class TopicSetup(BaseAgent):
    """Agent that tracks topics and create subscription object."""

    def __init__(
        self,
        model: str = ModelEnum.OpenAI.GPT_4_1,
        instructions_template: str = "newsfeed/topic_setup.system.jinja",
        model_settings: ModelSettings | None = None,
        web_search: BroadWebSearch | Tool | None = None
    ):
        """Init method."""
        name = "Topic Setup"
        instructions = self._render_prompt(
            instructions_template,
            time=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        )

        web_search = make_web_search_tool(web_search or BroadWebSearch())

        super().__init__(
            name=name,
            model=model,
            model_settings=model_settings,
            instructions=instructions,
            tools=[web_search],
            output_type=Topic
        )
        super().__post_init__()

    @classmethod
    def from_config(cls, config: TopicSetupConfig) -> TopicSetup:
        """Create an instance of TopicSetup from configuration."""
        web_search = make_web_search_tool_from_config(config.web_search)

        return cls(
            model=config.model,
            instructions_template=config.instructions_template,
            model_settings=config.model_settings,
            web_search=web_search
        )

    async def _input_formatter(
        self,
        context,
        input: TopicSetupInput
    ):
        """Format input for the agent."""
        return self._render_prompt(
            "newsfeed/topic_setup.user.jinja",
            topic=input.topic,
            raw_description=input.raw_description
        )
