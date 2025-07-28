"""Web Search Agent."""

import datetime
from typing import Any

from agents import (
    Agent,
    AgentHooks,
    ModelSettings,
    RunContextWrapper,
    RunResult,
    Tool,
    WebSearchTool,
)
from topix.agents.base import BaseAgent
from topix.agents.datatypes.context import ReasoningContext


class WebSearchAgentHook(AgentHooks):
    """Custom hook to handle the context and results of the web search agent."""

    async def on_end(
        self,
        context: RunContextWrapper[ReasoningContext],
        agent: Agent[ReasoningContext],
        output: Any,
    ):
        """Initialize the context for the web search agent."""
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


class WebSearch(BaseAgent[str]):
    """An Agent for web search operations.

    This class is responsible for managing the web search agent and its operations.
    """

    def __init__(
        self,
        model: str = "openai/gpt-4o-mini",
        instructions_template: str = "web_search.jinja",
        model_settings: ModelSettings | None = None,
    ):
        """
        Initialize the WebSearch agent.

        Args:
            instructions_template (str, optional): The instructions template to use.
                Defaults to "web_search.jinja".
            model_settings (ModelSettings, optional): The model settings to use.
                Defaults to ModelSettings(temperature=0.01).
        """
        name = "Web Search"
        instructions_dict = {"time": datetime.datetime.now().strftime("%Y-%m-%d")}
        instructions = self._render_prompt(instructions_template, **instructions_dict)
        tools = [WebSearchTool(search_context_size="medium")]
        hooks = WebSearchAgentHook()

        if model_settings is None:
            model_settings = ModelSettings(temperature=0.01)

        super().__init__(
            name=name,
            model=model,
            model_settings=model_settings,
            instructions=instructions,
            tools=tools,
            hooks=hooks,
        )

        super().__post_init__()

    async def _output_extractor(
        self, context: ReasoningContext, output: RunResult
    ) -> Any:
        context.web_search_results.append(output.final_output)
        return output.final_output
