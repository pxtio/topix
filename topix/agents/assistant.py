"""Main agent manager."""

import asyncio
import uuid

from collections.abc import AsyncGenerator
from datetime import datetime
from typing import Any

from agents import (
    Agent,
    AgentHooks,
    ModelSettings,
    RunContextWrapper,
    Runner,
    Tool,
    function_tool,
)
from topix.agents.base import BaseAgentManager
from topix.agents.datatypes.context import ReasoningContext
from topix.agents.datatypes.stream import AgentStreamMessage, StreamMessageType
from topix.agents.datatypes.tools import AgentToolName
from topix.agents.prompt_utils import render_prompt
from topix.agents.sessions import AssistantSession
from topix.agents.tools.answer_reformulate import AnswerReformulate
from topix.agents.tools.web_search import WebSearch


class AssistantAgentHook(AgentHooks):
    """Custom hook to handle the context and results of the reflection agent."""

    async def on_end(
        self,
        context: RunContextWrapper[ReasoningContext],
        agent: Agent[ReasoningContext],
        output: Any
    ):
        """Reset the agent's tool use behavior and enable all tools."""
        agent.tool_use_behavior = "run_llm_again"
        for tool in agent.tools:
            tool.is_enabled = True

    async def on_tool_start(
        self,
        context: RunContextWrapper[ReasoningContext],
        agent: Agent[ReasoningContext],
        tool: Tool
    ):
        """Handle tool calls and update the context with the results."""
        if tool.name == 'run_answer_reformulate':
            # If the tool is the answer reformulation tool,
            # we do not need to recall the LLM
            agent.tool_use_behavior = "stop_on_first_tool"

    async def on_tool_end(
        self,
        context: RunContextWrapper[ReasoningContext],
        agent: Agent[ReasoningContext],
        tool: Tool,
        result: str
    ):
        """Handle tool calls and update the context with the results."""
        if tool.name == 'run_web_search':
            agent.model_settings.tool_choice = "required"


class AssistantManager(BaseAgentManager):
    """Manager for the reflection agent."""

    name = "Reflection Agent"
    model_name = "gpt-4o"
    prompts = "reasoning.jinja"

    def __init__(self):
        """Initialize the reflection agent manager."""
        self.web_manager = WebSearch()
        self.answer_reformulate_manager = AnswerReformulate()

        self.agent = Agent[ReasoningContext](
            name=self.name,
            instructions=render_prompt(self.prompts).format(
                time=datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            ),
            tools=[
                function_tool(self.web_manager.as_tool, name_override="run_web_search"),
                function_tool(
                    self.answer_reformulate_manager.as_tool,
                    name_override="run_answer_reformulate"
                ),
            ],
            hooks=AssistantAgentHook(),
            model=self.model_name,
            model_settings=ModelSettings(temperature=0.0)
        )

    async def run(
        self,
        context: ReasoningContext,
        query: str,
        max_turns: int = 5
    ):
        """Run the reflection agent with the provided context and query."""
        result = await Runner.run(
            self.agent,
            context=context,
            input=query,
            max_turns=max_turns
        )
        return result.final_output

    @staticmethod
    def is_delta(message: str | AgentStreamMessage) -> bool:
        """Check if the message is a delta."""
        return isinstance(message, AgentStreamMessage) and \
            message.type == StreamMessageType.TOKEN

    async def stream(
        self,
        query: str,
        context: ReasoningContext,
        max_turns: int = 5,
        session: AssistantSession | None = None
    ) -> AsyncGenerator[AgentStreamMessage, str]:
        """Stream the results of the reflection agent."""
        if session:
            await session.add_items([
                {
                    "role": "user",
                    "content": query
                }
            ])
            history = await session.get_items()
        else:
            history = [{"role": "user", "content": query}]
        streamed_answer = Runner.run_streamed(
            self.agent,
            context=context,
            input=history,
            max_turns=max_turns,
        )

        id_ = uuid.uuid4().hex

        async def stream_events():

            async for stream_chunk in self.handle_stream_events(
                streamed_answer,
                tool_id=id_,
                tool_name=AgentToolName.RAW_MESSAGE
            ):
                await context._message_queue.put(stream_chunk)
            await context._message_queue.put("<END_OF_AGENT>")

        # Start the streaming tasks
        asyncio.create_task(stream_events())

        final_answer = ""
        raw_answer = ""

        while True:
            message = await context._message_queue.get()
            if AssistantManager.is_delta(message):
                if message.tool_name == AgentToolName.RAW_MESSAGE:
                    raw_answer += message.delta.content
                elif message.tool_name == AgentToolName.ANSWER_REFORMULATE:
                    final_answer += message.delta.content
            if message == "<END_OF_AGENT>":
                if session:
                    # If a session is provided, store the final answer
                    await session.add_items([
                        {
                            "role": "assistant",
                            "content": final_answer if final_answer else raw_answer
                        }
                    ])
                break
            yield message
