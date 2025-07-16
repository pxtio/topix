"""Main agent manager."""

import asyncio
import uuid

from collections.abc import AsyncGenerator
from datetime import datetime
from typing import Any

from openai.types.responses import ResponseTextDeltaEvent

from agents import (
    Agent,
    AgentHooks,
    ModelSettings,
    RunContextWrapper,
    Runner,
    Tool,
    function_tool,
)
from topix.agents.datatypes import (
    AgentStreamMessage,
    AgentToolName,
    Context,
    StreamMessageType,
)
from topix.agents.prompt_utils import render_prompt
from topix.agents.tools.answer_reformulate import AnswerReformulate
from topix.agents.tools.web_search import WebSearch


class AssistantAgentHook(AgentHooks):
    """Custom hook to handle the context and results of the reflection agent."""

    async def on_end(
        self,
        context: RunContextWrapper[Context],
        agent: Agent[Context],
        output: Any
    ):
        """Reset the agent's tool use behavior and enable all tools."""
        agent.tool_use_behavior = "run_llm_again"
        for tool in agent.tools:
            tool.is_enabled = True

    async def on_tool_start(
        self,
        context: RunContextWrapper[Context],
        agent: Agent[Context],
        tool: Tool
    ):
        """Handle tool calls and update the context with the results."""
        if tool.name == 'run_answer_reformulate':
            # If the tool is the answer reformulation tool,
            # we do not need to recall the LLM
            agent.tool_use_behavior = "stop_on_first_tool"

    async def on_tool_end(
        self,
        context: RunContextWrapper[Context],
        agent: Agent[Context],
        tool: Tool,
        result: str
    ):
        """Handle tool calls and update the context with the results."""
        if tool.name == 'run_web_search':
            agent.model_settings.tool_choice = "required"


class AssistantManager:
    """Manager for the reflection agent."""

    name = "Reflection Agent"
    model_name = "gpt-4o"
    prompts = "reasoning.jinja"

    def __init__(self):
        """Initialize the reflection agent manager."""
        self.web_manager = WebSearch()
        self.answer_reformulate_manager = AnswerReformulate()

        self.agent = Agent[Context](
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

    async def run(self, context: Context, query: str, max_turns: int = 5):
        """Run the reflection agent with the provided context and query."""
        result = await Runner.run(
            self.agent,
            context=context,
            input=query,
            max_turns=max_turns,
        )
        return result.final_output

    async def stream(
        self,
        query: str,
        context: Context,
        max_turns: int = 5
    ) -> AsyncGenerator[AgentStreamMessage, str]:
        """Stream the results of the reflection agent."""
        streamed_answer = Runner.run_streamed(
            self.agent,
            context=context,
            input=query,
            max_turns=max_turns,
        )

        id_ = uuid.uuid4().hex

        async def stream_events():

            async for event in streamed_answer.stream_events():
                if event.type == "raw_response_event" and \
                        isinstance(event.data, ResponseTextDeltaEvent):
                    await context._message_queue.put(
                        AgentStreamMessage(
                            type=StreamMessageType.TOKEN,
                            tool_id=id_,
                            tool_name=AgentToolName.RAW_MESSAGE,
                            content=event.data.delta
                        )
                    )
            await context._message_queue.put("<END_OF_AGENT>")

        # Start the streaming tasks
        asyncio.create_task(stream_events())

        while True:
            message = await context._message_queue.get()
            if message == "<END_OF_AGENT>":
                break
            yield message
