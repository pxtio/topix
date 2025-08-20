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
from src.agents.assistant.answer_reformulate import AnswerReformulate
from src.agents.assistant.code_interpreter import CodeInterpreter
from src.agents.assistant.web_search import WebSearch
from src.agents.base import BaseAgent
from src.agents.datatypes.context import ReasoningContext
from src.agents.datatypes.model_enum import ModelEnum
from src.agents.datatypes.tools import AgentToolName
from src.agents.datatypes.web_search import WebSearchOption


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


class Plan(BaseAgent):
    """Manager for the reflection agent."""

    def __init__(
        self,
        model: str = ModelEnum.OpenAI.GPT_4_1,
        instructions_template: str = "plan.system.jinja",
        model_settings: ModelSettings | None = None,
        search_choice: WebSearchOption = WebSearchOption.OPENAI,
    ):
        """Init method."""
        name = "Plan"
        instructions = self._render_prompt(
            instructions_template,
            time=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        )
        if model_settings is None:
            model_settings = ModelSettings(temperature=0.01, max_tokens=2000)

        web_search = self.setup_websearch(search_choice)

        tools = [
            web_search.as_tool(AgentToolName.WEB_SEARCH, streamed=True),
            AnswerReformulate(model=model).as_tool(
                AgentToolName.ANSWER_REFORMULATE,
                streamed=True,
            ),
            CodeInterpreter().as_tool(AgentToolName.CODE_INTERPRETER, streamed=True),
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

    def setup_websearch(
        self,
        search_choice: WebSearchOption
    ) -> WebSearch:
        """Set up the web search tool based on the search choice."""
        match search_choice:
            case WebSearchOption.OPENAI:
                return WebSearch()
            case WebSearchOption.PERPLEXITY:
                return WebSearch(
                    model="perplexity/sonar",
                    search_engine=search_choice
                )
            case WebSearchOption.TAVILY:
                return WebSearch(
                    instructions_template="decoupled_web_search.jinja",
                    search_engine=search_choice
                )
            case WebSearchOption.LINKUP:
                return WebSearch(
                    instructions_template="decoupled_web_search.jinja",
                    search_engine=search_choice
                )
            case _:
                raise ValueError(f"Unknown web search option: {search_choice}")

    def _format_message(self, message: dict[str, str]) -> str:
        role = message["role"]
        content = message["content"]
        return f"<message role='{role}'>\n<![CDATA[\n{content}\n]]>\n</message>"

    async def _input_formatter(self, context: ReasoningContext, input: list[dict[str, str]]) -> str:
        assert len(input) > 0, \
            ValueError("Input must contain at least one message.")
        assert input[-1]['role'] == 'user', \
            ValueError("Input must end with a user message.")

        user_query = input[-1]['content']
        messages = '\n\n'.join(self._format_message(msg) for msg in input[:-1])

        user_prompt = self._render_prompt(
            "plan.user.jinja",
            messages=messages,
            user_query=user_query,
            time=datetime.now().isoformat()
        )

        return user_prompt
