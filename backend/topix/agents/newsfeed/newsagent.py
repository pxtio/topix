"""News analyst Agent."""

from __future__ import annotations

from datetime import datetime
import logging

from agents import ModelSettings, AgentHooks, RunContextWrapper, Agent, Tool

from topix.agents.base import BaseAgent
from topix.agents.datatypes.model_enum import ModelEnum
from topix.agents.newsfeed.datatypes import Newsletter, Subscription
from topix.agents.assistant.web_search import WebSearch
from topix.agents.datatypes.tools import AgentToolName
from topix.agents.datatypes.context import Context
from topix.agents.datatypes.context import ReasoningContext
from typing import Any


logger = logging.getLogger(__name__)


class NewsHooks(AgentHooks):
    """Custom hook to handle the context and results of the reflection agent."""

    async def on_end(
        self,
        context: RunContextWrapper[ReasoningContext],
        agent: Agent[ReasoningContext],
        output: Any,
    ):
        """Reset the agent's tool use behavior and enable all tools."""
        agent.tool_use_behavior = "run_llm_again"
        for tool in agent.tools:
            tool.is_enabled = True

    async def on_tool_start(
        self,
        context: RunContextWrapper[ReasoningContext],
        agent: Agent[ReasoningContext],
        tool: Tool,
    ):
        """Handle tool calls and update the context with the results."""
        pass

    async def on_tool_end(
        self,
        context: RunContextWrapper[ReasoningContext],
        agent: Agent[ReasoningContext],
        tool: Tool,
        result: str,
    ):
        """Handle tool calls and update the context with the results."""
        pass


class NewsAgent(BaseAgent):
    """News analyst Agent for synthesizing and thematically analyzing text."""

    def __init__(
        self,
        model: str = ModelEnum.OpenAI.GPT_4_1,
        instructions_template: str = "news.system.jinja",
        model_settings: ModelSettings | None = None,
        web_search: WebSearch | None = None,
    ):
        """Init method."""

        name = "News analyst"
        instructions = self._render_prompt(
            instructions_template,
            time=datetime.now().isoformat(),
        )
        if model_settings is None:
            model_settings = ModelSettings(temperature=0.1)

        web_search = web_search or WebSearch()

        tools = [
            web_search.as_tool(AgentToolName.WEB_SEARCH, streamed=True),
        ]

        hooks = NewsHooks()

        super().__init__(
            name=name,
            model=model,
            model_settings=model_settings,
            instructions=instructions,
            output_type=Newsletter,
            tools=tools,
            hooks=hooks,
        )
        super().__post_init__()

    async def _input_formatter(
        self,
        input: Subscription,
        context: Context | None = None,
    ) -> str:
        """Format the input for the news agent.

        Args:
            context (Context): The context of the newsletter.
            label (str): The name of the newsletter.
            keywords (list[str]): The keywords we are interested to cover in the newsletter.
            description (str): The description of what we want to cover in the newsletter.
            domains (list[str]): a list of websites we trust to be relevant to the newsletter.
            recurrence (str): The timeframe in the past we want to cover starting now.
            language (str): The language of the newsletter.
            time (str): The time of creation of the newsletter.
        Returns:
            str: The formatted input string.

        """
        # Optionally, you could include chat history if relevant.
        user_prompt = self._render_prompt(
            "news.user.jinja",
            label=input.label,
            keywords=input.keywords,
            description=input.description,
            domains=input.domains,
            recurrence=input.recurrence,
            language=input.language,
            time=datetime.now().isoformat(),
        )
        # logger.info("Formatted prompt", user_prompt)
        return user_prompt
