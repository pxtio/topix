"""Main agent manager."""

from datetime import datetime
from typing import Any

from agents import (
    Agent,
    AgentHooks,
    ModelSettings,
    RunContextWrapper,
    Tool,
)
from topix.agents.base import BaseAgent
from topix.agents.datatypes.context import ReasoningContext
from topix.agents.assistant.answer_reformulate import AnswerReformulate
from topix.agents.assistant.web_search import WebSearch
from topix.agents.datatypes.model_enum import ModelEnum
from topix.agents.datatypes.tools import AgentToolName


class PlanHooks(AgentHooks):
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
        if tool.name == AgentToolName.ANSWER_REFORMULATE:
            # If the tool is the answer reformulation tool,
            # we do not need to recall the LLM
            agent.tool_use_behavior = "stop_on_first_tool"

    async def on_tool_end(
        self,
        context: RunContextWrapper[ReasoningContext],
        agent: Agent[ReasoningContext],
        tool: Tool,
        result: str,
    ):
        """Handle tool calls and update the context with the results."""
        if tool.name == AgentToolName.WEB_SEARCH:
            agent.model_settings.tool_choice = "required"


class Plan(BaseAgent[str]):
    """Manager for the reflection agent."""

    def __init__(
        self,
        model: str = ModelEnum.OpenAI.GPT_4O,
        instructions_template: str = "plan.jinja",
        model_settings: ModelSettings | None = None,
    ):
        name = "Plan"
        instructions = self._render_prompt(
            instructions_template,
            time=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        )
        if model_settings is None:
            model_settings = ModelSettings(temperature=0.01)
        tools = [
            WebSearch().as_tool(AgentToolName.WEB_SEARCH, streamed=True),
            AnswerReformulate().as_tool(
                AgentToolName.ANSWER_REFORMULATE,
                streamed=True,
            ),
        ]
        hooks = PlanHooks()

        super().__init__(
            name=name,
            model=model,
            model_settings=model_settings,
            instructions=instructions,
            tools=tools,
            hooks=hooks,
        )
        super().__post_init__()
