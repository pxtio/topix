"""Main agent manager."""

from __future__ import annotations

from datetime import datetime

from agents import (
    FunctionTool,
    ModelSettings,
)

from topix.agents.assistant.code_interpreter import CodeInterpreter
from topix.agents.assistant.memory_search import MemorySearch
from topix.agents.base import BaseAgent
from topix.agents.config import PlanConfig
from topix.agents.datatypes.context import ReasoningContext
from topix.agents.datatypes.model_enum import ModelEnum
from topix.agents.datatypes.tools import AgentToolName
from topix.agents.websearch.handler import WebSearchHandler
from topix.agents.websearch.navigate import NavigateAgent
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
            tools=tools,
        )
        super().__post_init__()

    @classmethod
    def from_config(cls, content_store: ContentStore, config: PlanConfig) -> Plan:
        """Create an instance of Plan from configuration."""
        tools = []
        web_search_tool = WebSearchHandler.from_config(config.web_search)
        tools.append(web_search_tool)
        memory_search_agent = MemorySearch.from_config(content_store, config.memory_search)
        memory_search_tool = memory_search_agent.as_tool(name=AgentToolName.MEMORY_SEARCH, tool_description="Memory Search Tool")
        tools.append(memory_search_tool)
        if config.code_interpreter:
            code_interpreter_agent = CodeInterpreter.from_config(config.code_interpreter)
            code_interpreter_tool = code_interpreter_agent.as_tool(
                name=AgentToolName.CODE_INTERPRETER,
                tool_description="Code Interpreter Tool",
            )
            tools.append(code_interpreter_tool)
        if config.navigate:
            navigate_agent = NavigateAgent.from_config(config.navigate)
            navigate_tool = navigate_agent.as_tool(
                name=AgentToolName.NAVIGATE,
                tool_description="Navigate Tool",
            )
            tools.append(navigate_tool)

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
