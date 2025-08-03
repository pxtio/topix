"""Web Search Agent."""

import uuid

from typing import Any

from agents import (
    Agent,
    AgentHooks,
    ModelSettings,
    RunContextWrapper,
    Runner,
    Tool,
    WebSearchTool,
)
from topix.agents.base import BaseToolAgentManager
from topix.agents.datatypes.context import ReasoningContext
from topix.agents.datatypes.stream import AgentStreamMessage, StreamMessageType, ToolExecutionState
from topix.agents.datatypes.tools import AgentToolName
from topix.agents.prompt_utils import render_prompt
from topix.agents.utils import format_tool_completed_message, format_tool_start_message


class WebSearchAgentHook(AgentHooks):
    """Custom hook to handle the context and results of the web search agent."""

    async def on_end(
        self,
        context: RunContextWrapper[ReasoningContext],
        agent: Agent[ReasoningContext],
        output: Any
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


class WebSearch(BaseToolAgentManager):
    """A manager for web search operations.

    This class is responsible for managing the web search agent and its operations.
    """

    name = "Web Search"
    model_name = "gpt-4o-mini"
    prompts = "web_search.jinja"

    def __init__(self):
        """Init method."""
        self.web_search_agent = Agent(
            model=self.model_name,
            name=self.name,
            instructions=render_prompt(self.prompts),
            tools=[
                WebSearchTool(search_context_size="medium")
            ],
            model_settings=ModelSettings(
                tool_choice="required",
                temperature=0.0
            ),
            hooks=WebSearchAgentHook(),
        )

    async def run(self, query: str, max_turns: int = 2) -> str:
        """Run the web search agent with the provided query.

        Args:
            query (str): The search query.
            max_turns (int): The maximum number of turns for the search. Defaults to 2.

        Returns:
            str: The summary of the web search results.

        """
        try:
            result = await Runner.run(
                starting_agent=self.web_search_agent,
                input=query,
                max_turns=max_turns,
            )
            return result.final_output
        except Exception:
            return ""

    async def as_tool(
        self,
        wrapper: RunContextWrapper[ReasoningContext],
        query: str,
        max_turns: int = 2
    ) -> str:
        """Run the web search agent as a tool with the provided query.

        Args:
            wrapper (RunContextWrapper[ReasoningContext]): The context wrapper for the agent.
            query (str): The search query.
            max_turns (int): The maximum number of turns for the search. Defaults to 2.

        Returns:
            str: The summary of the web search results.

        """
        id_ = uuid.uuid4().hex
        fixed_params = {
            "tool_id": id_,
            "tool_name": AgentToolName.WEB_SEARCH,
        }

        await wrapper.context._message_queue.put(
            AgentStreamMessage(
                type=StreamMessageType.STATE,
                execution_state=ToolExecutionState.STARTED,
                status_message=format_tool_start_message(
                    self.name,
                    f"Query: `{query}`."
                ),
                **fixed_params
            )
        )

        # Use streaming:
        res = Runner.run_streamed(
            self.web_search_agent,
            input=query,
            context=wrapper.context,
            max_turns=max_turns,
        )

        async for stream_chunk in self.handle_stream_events(res, **fixed_params):
            await wrapper.context._message_queue.put(stream_chunk)

        await wrapper.context._message_queue.put(
            AgentStreamMessage(
                type=StreamMessageType.STATE,
                execution_state=ToolExecutionState.COMPLETED,
                status_message=format_tool_completed_message(
                    self.name,
                    f"Search completed for query `{query}`."
                ),
                **fixed_params
            )
        )

        wrapper.context.web_search_results.append(res.final_output)
        return res
