"""Web Search Agent."""

import datetime

from typing import Any

from agents import (
    Agent,
    AgentHooks,
    CodeInterpreterTool,
    ItemHelpers,
    ModelSettings,
    RunContextWrapper,
    RunResult,
    Tool,
)
from topix.agents.base import BaseAgent
from topix.agents.datatypes.context import ReasoningContext
from topix.agents.datatypes.model_enum import ModelEnum


class CodeInterpreterAgentHook(AgentHooks):
    """Custom hook to handle the context and results of the Code Interpreter agent."""

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


class CodeInterpreter(BaseAgent):
    """An Agent for web search operations.

    This class is responsible for managing the web search agent and its operations.
    """

    def __init__(
        self,
        model: str = ModelEnum.OpenAI.GPT_4O,
        instructions_template: str = "code_interpreter.jinja",
        model_settings: ModelSettings | None = None,
    ):
        """Initialize the gent."""
        name = "Code Interpreter"
        instructions_dict = {"time": datetime.datetime.now().strftime("%Y-%m-%d")}
        instructions = self._render_prompt(instructions_template, **instructions_dict)
        tools = [
            CodeInterpreterTool(
                tool_config={"type": "code_interpreter", "container": {"type": "auto"}}
            )
        ]
        hooks = CodeInterpreterAgentHook()

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
    ) -> RunResult:
        return ItemHelpers.text_message_outputs(output.new_items)
