"""Web Search Agent."""

import uuid

from typing import Any

from openai.types.responses import ResponseTextDeltaEvent

from agents import (
    Agent,
    AgentHooks,
    ModelSettings,
    RunContextWrapper,
    Runner,
    Tool,
    WebSearchTool,
)
from topix.agents.base import BaseAgentManager
from topix.agents.datatypes import (
    AgentStreamMessage,
    AgentToolName,
    Context,
    StreamMessageType,
    ToolExecutionState,
)
from topix.agents.prompt_utils import render_prompt
from topix.agents.utils import format_tool_finished_message, format_tool_start_message


class WebSearchAgentHook(AgentHooks):
    """Custom hook to handle the context and results of the knowledge base search agent."""

    async def on_end(
        self,
        context: RunContextWrapper[Context],
        agent: Agent[Context],
        output: Any
    ):
        """Initialize the context for the knowledge base search agent."""
        # Initialize the context if not already done
        for tool in agent.tools:
            tool.is_enabled = True

    async def on_tool_end(
        self,
        context: RunContextWrapper[Context],
        agent: Agent[Context],
        tool: Tool,
        result: str,
    ):
        """Handle tool calls and update the context with the results."""
        tool.is_enabled = False


class WebSearch(BaseAgentManager):
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
            tools=[WebSearchTool(search_context_size="low")],
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
        wrapper: RunContextWrapper[Context],
        query: str,
        max_turns: int = 2
    ) -> str:
        """Run the web search agent as a tool with the provided query.

        Args:
            wrapper (RunContextWrapper[Context]): The context wrapper for the agent.
            query (str): The search query.
            max_turns (int): The maximum number of turns for the search. Defaults to 2.

        Returns:
            str: The summary of the web search results.

        """
        id_ = uuid.uuid4().hex
        await wrapper.context._message_queue.put(
            AgentStreamMessage(
                type=StreamMessageType.STATE,
                tool_id=id_,
                tool_name=AgentToolName.WEB_SEARCH,
                execution_state=ToolExecutionState.STARTED,
                status_message=format_tool_start_message(self.name, query),
            )
        )

        # Use streaming:
        res = Runner.run_streamed(
            self.web_search_agent,
            input=query,
            context=wrapper.context,
            max_turns=max_turns,
        )

        async for event in res.stream_events():
            if event.type == "raw_response_event" and \
                    isinstance(event.data, ResponseTextDeltaEvent):
                await wrapper.context._message_queue.put(
                    AgentStreamMessage(
                        type=StreamMessageType.TOKEN,
                        tool_id=id_,
                        tool_name=AgentToolName.WEB_SEARCH,
                        content=event.data.delta
                    )
                )

        await wrapper.context._message_queue.put(
            AgentStreamMessage(
                type=StreamMessageType.STATE,
                tool_id=id_,
                tool_name=AgentToolName.WEB_SEARCH,
                execution_state=ToolExecutionState.COMPLETED,
                status_message=format_tool_finished_message(
                    self.name,
                    "Search completed successfully."
                )
            )
        )

        wrapper.context.web_search_results.append(res.final_output)
        return res
