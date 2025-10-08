"""Main agent manager."""
from __future__ import annotations

from datetime import datetime
from typing import Any

from agents import (
    Agent,
    AgentHooks,
    ModelSettings,
    RunContextWrapper,
    Tool,
)

from topix.agents.assistant.code_interpreter import CodeInterpreter
from topix.agents.assistant.memory_search import NOT_FOUND, MemorySearch
from topix.agents.base import BaseAgent
from topix.agents.config import PlanConfig
from topix.agents.datatypes.context import ReasoningContext
from topix.agents.datatypes.model_enum import ModelEnum
from topix.agents.datatypes.tools import AgentToolName
from topix.agents.websearch.handler import WebSearchHandler
from topix.agents.websearch.navigate import NavigateAgent
from topix.store.qdrant.store import ContentStore


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
        pass

    async def on_tool_end(
        self,
        context: RunContextWrapper[ReasoningContext],
        agent: Agent[ReasoningContext],
        tool: Tool,
        result: str,
    ):
        """Handle tool calls and update the context with the results."""
        if tool.name == AgentToolName.MEMORY_SEARCH:
            if result == NOT_FOUND:
                tool.is_enabled = False


class Plan(BaseAgent):
    """Manager for the reflection agent."""

    def __init__(
        self,
        model: str = ModelEnum.OpenAI.GPT_4_1,
        instructions_template: str = "plan.system.jinja",
        model_settings: ModelSettings | None = None,
        web_search_tool: Tool | None = None,
        memory_search: MemorySearch | None = None,
        code_interpreter: CodeInterpreter | None = None,
        content_store: ContentStore | None = None,
        navigate: NavigateAgent | None = None,
    ):
        """Init method."""
        name = "Plan"
        instructions = self._render_prompt(
            instructions_template,
            time=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        )

        model_settings = model_settings or ModelSettings(max_tokens=8000)

        if not web_search_tool:
            web_search_tool = WebSearchHandler.get_openai_web_tool()

        content_store = content_store or ContentStore.from_config()
        memory_search = memory_search or MemorySearch(content_store=content_store)
        code_interpreter = code_interpreter or CodeInterpreter()
        navigate = navigate or NavigateAgent()

        tools = [
            web_search_tool,
            memory_search.as_tool(AgentToolName.MEMORY_SEARCH, streamed=True),
            code_interpreter.as_tool(AgentToolName.CODE_INTERPRETER, streamed=True),
            navigate.as_tool(AgentToolName.NAVIGATE, streamed=True),
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

    @classmethod
    def from_config(cls, content_store: ContentStore, config: PlanConfig) -> Plan:
        """Create an instance of Plan from configuration."""
        web_search_tool = WebSearchHandler.from_config(config.web_search)
        return cls(
            web_search_tool=web_search_tool,
            memory_search=MemorySearch.from_config(content_store, config.memory_search),
            code_interpreter=CodeInterpreter.from_config(config.code_interpreter),
            model=config.model,
            instructions_template=config.instructions_template,
            model_settings=config.model_settings,
            navigate=NavigateAgent.from_config(config.navigate),
        )

    def _format_message(self, message: dict[str, str]) -> str:
        role = message["role"]
        content = message["content"]
        return f"<message role='{role}'>\n<![CDATA[\n{content}\n]]>\n</message>"

    async def _input_formatter(
        self, context: ReasoningContext, input: list[dict[str, str]]
    ) -> str:
        assert len(input) > 0, ValueError("Input must contain at least one message.")
        assert input[-1]["role"] == "user", ValueError(
            "Input must end with a user message."
        )

        user_query = input[-1]["content"]
        messages = "\n\n".join(self._format_message(msg) for msg in input[:-1])

        user_prompt = self._render_prompt(
            "plan.user.jinja",
            messages=messages,
            user_query=user_query,
            time=datetime.now().isoformat(),
        )

        return user_prompt
