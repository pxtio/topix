"""Main agent manager."""

from __future__ import annotations

from datetime import datetime

from agents import (
    FunctionTool,
    ModelSettings,
)

from topix.agents.assistant.code_interpreter import CodeInterpreter
from topix.agents.base import BaseAgent
from topix.agents.config import PlanConfig
from topix.agents.datatypes.context import ReasoningContext
from topix.agents.datatypes.model_enum import ModelEnum
from topix.agents.datatypes.tools import AgentToolName, tool_descriptions
from topix.agents.image.gen import generate_image_tool
from topix.agents.memory.search import create_memory_search_tool
from topix.agents.websearch.handler import WebSearchHandler
from topix.agents.websearch.navigate import NavigateAgent
from topix.agents.widgets.finance import display_stock_widget_tool
from topix.agents.widgets.image import display_image_search_widget_tool
from topix.agents.widgets.weather import display_weather_widget_tool
from topix.api.utils.common import iso_to_clear_date
from topix.store.qdrant.store import ContentStore


class Plan(BaseAgent):
    """Manager for the reflection agent."""

    def __init__(
        self,
        model: str = ModelEnum.OpenAI.GPT_4_1,
        instructions_template: str = "plan.system.jinja",
        model_settings: ModelSettings | None = None,
        tools: list[FunctionTool] | None = None,
    ):
        """Init method."""
        name = "Plan"
        instructions = self._render_prompt(
            instructions_template,
            time=iso_to_clear_date(datetime.now().isoformat()),
        )

        model_settings = model_settings or ModelSettings(max_tokens=8000)

        super().__init__(
            name=name,
            model=model,
            model_settings=model_settings,
            instructions=instructions,
            tools=tools or [],
        )
        super().__post_init__()

    @classmethod
    def from_config(cls, content_store: ContentStore, config: PlanConfig, memory_filters: dict | None = None) -> Plan:
        """Create an instance of Plan from configuration."""
        tools = [
            display_stock_widget_tool,
            display_weather_widget_tool,
            display_image_search_widget_tool,
            WebSearchHandler.from_config(config.web_search),
            create_memory_search_tool(memory_filters, content_store),  # memory search tool
        ]

        if config.code_interpreter:
            tools.append(
                CodeInterpreter.from_config(config.code_interpreter).as_tool(
                    tool_name=AgentToolName.CODE_INTERPRETER,
                    tool_description=tool_descriptions.get(AgentToolName.CODE_INTERPRETER),
                )
            )

        if config.navigate:
            tools.append(
                NavigateAgent.from_config(config.navigate).as_tool(
                    tool_name=AgentToolName.NAVIGATE,
                    tool_description=tool_descriptions.get(AgentToolName.NAVIGATE),
                )
            )

        if config.image_generation:
            tools.append(generate_image_tool)

        return cls(
            model=config.model,
            instructions_template=config.instructions_template,
            model_settings=config.model_settings,
            tools=tools,
        )

    def _format_message(self, message: dict[str, str]) -> str:
        role = message["role"]
        content = message["content"]
        return f"<message role='{role}'>\n<![CDATA[\n{content}\n]]>\n</message>"

    async def _input_formatter(self, context: ReasoningContext, input: list[dict[str, str]]) -> str:
        assert len(input) > 0, ValueError("Input must contain at least one message.")
        assert input[-1]["role"] == "user", ValueError("Input must end with a user message.")

        user_query = input[-1]["content"]
        messages = "\n\n".join(self._format_message(msg) for msg in input[:-1])

        user_prompt = self._render_prompt(
            "plan.user.jinja",
            messages=messages,
            user_query=user_query,
            time=iso_to_clear_date(datetime.now().isoformat()),
        )

        return user_prompt
