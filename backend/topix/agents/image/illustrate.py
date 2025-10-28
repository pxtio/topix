from typing import Any, Literal


from topix.agents.datatypes.context import ReasoningContext
from agents import Agent, Tool, function_tool, ModelSettings, AgentHooks, RunContextWrapper
from topix.agents.base import BaseAgent
from topix.agents.datatypes.model_enum import ModelEnum
from topix.agents.datatypes.outputs import TopicIllustratorOutput
from topix.datatypes.recurrence import Recurrence

from topix.agents.image.describe import ImageDescription, image_descriptor
from topix.agents.image.search import search_linkup, search_serper


class TopicIllustratorAgentHook(AgentHooks):
    """Custom hook to handle the context and results of the image search agent."""

    async def on_end(
        self,
        context: RunContextWrapper[ReasoningContext],
        agent: Agent[ReasoningContext],
        output: Any,
    ):
        """Initialize the context for the image search agent."""
        # Initialize the context if not already done
        for tool in agent.tools:
            tool.is_enabled = True

    async def on_tool_end(
        self,
        context: RunContextWrapper[ReasoningContext],
        agent: Agent[ReasoningContext],
        tool: Tool,
        result: str,
    ):
        """Handle tool calls and update the context with the results."""
        tool.is_enabled = False


class TopicIllustrator(BaseAgent):

    def __init__(
        self,
        model: str = ModelEnum.OpenAI.GPT_4O_MINI,
        instructions_template: str = "topic_illustrator.jinja",
        model_settings: ModelSettings | None = None,
        image_search_engine: Literal["serper", "linkup"] = "serper",
        language: Literal["en", "fr"] = "fr",
    ):
        """Initialize the TopicIllustrator agent."""
        name = "Topic Illustrator"
        self.image_search_engine = image_search_engine
        self.language = language

        instructions = self._render_prompt(instructions_template)
        tools = self._configure_tools()

        if model_settings is None:
            model_settings = ModelSettings(temperature=0.01)

        super().__init__(
            name=name,
            model=model,
            model_settings=model_settings,
            instructions=instructions,
            tools=tools,
            output_type=TopicIllustratorOutput,
            hooks=TopicIllustratorAgentHook(),
        )

        super().__post_init__()

    def _configure_tools(
        self,
    ) -> list[Tool]:
        """Configure tools based on image search."""
        @function_tool
        async def image_search(query: str, recency: Recurrence | None = None) -> list[tuple[str, ImageDescription]]:
            """Search for images that are relevant to the query,
            and return a description of the images along with their urls."""
            if self.image_search_engine == "serper":
                image_urls = search_serper(query, num_results=4, recency=recency, language=self.language)
            elif self.image_search_engine == "linkup":
                image_urls = search_linkup(query, num_results=4, recency=recency)
            else:
                raise ValueError(f"Invalid image search engine: {self.image_search_engine}")
            descriptions = await image_descriptor(image_urls)
            return [
                (url, description)
                for url, description in zip(image_urls, descriptions)
                if description is not None
            ]

        return [image_search]
