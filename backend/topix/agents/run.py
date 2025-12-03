"""Agent runner supporting streaming mode."""


import asyncio
import logging

from collections.abc import AsyncGenerator
from typing import Any

from agents import MaxTurnsExceeded, TResponseInputItem
from pydantic import BaseModel

from topix.agents.base import BaseAgent
from topix.agents.datatypes.context import Context
from topix.agents.datatypes.stream import AgentStreamMessage
from topix.agents.datatypes.tool_call import ToolCall
from topix.agents.datatypes.tools import AgentToolName
from topix.agents.tool_handler import ToolHandler

logger = logging.getLogger(__name__)

DEFAULT_MAX_TURNS = 8


class AgentRunner:
    """Agent runner supporting streaming mode."""

    @classmethod
    async def run(
        cls,
        starting_agent: BaseAgent,
        input: str | list[TResponseInputItem] | BaseModel,
        *,
        context: Context,
        max_turns: int = DEFAULT_MAX_TURNS,
        name: str = AgentToolName.RAW_MESSAGE,
    ) -> Any:
        """Run a workflow starting at the given agent. The agent will run in a loop until a final output is generated.

            1. The agent is invoked with the given input.
            2. If there is a final output (i.e. the agent produces something of type
                `agent.output_type`, the loop terminates.
            3. If there's a handoff, we run the loop again, with the new agent.
            4. Else, we run tool calls (if any), and re-run the loop.
            In two cases, the agent may raise an exception:
            1. If the max_turns is exceeded, a MaxTurnsExceeded exception is raised.

        Args:
            starting_agent: The starting agent to run.
            input: The initial input to the agent. You can pass a single string for a user message,
                or a list of input items.
            context: The context to run the agent with.
            max_turns: The maximum number of turns to run the agent for. A turn is defined as one
                AI invocation (including any tool calls that might occur).
            name: The logged name in the tool call.

        Returns:
            The final output of the agent.

        """  # noqa: E501
        run_agent = ToolHandler.convert_agent_to_func(
            starting_agent,
            tool_name=name,
            max_turns=max_turns,
            streamed=False,
            is_subagent=False,
        )

        async def _agent_wrapper():
            try:
                return await run_agent(context, input)
            except MaxTurnsExceeded as e:
                logger.error("Agent exceeded max turns: %s", e)
                raise e
            except Exception as e:
                raise e

        output = await _agent_wrapper()

        # Empty the queue
        context._message_queue = asyncio.Queue()
        return output

    @classmethod
    async def run_streamed(
        cls,
        starting_agent: BaseAgent,
        input: str | list[TResponseInputItem] | BaseModel,
        context: Context,
        max_turns: int = DEFAULT_MAX_TURNS,
        name: str = AgentToolName.RAW_MESSAGE,
    ) -> AsyncGenerator[AgentStreamMessage, str]:
        """Run a workflow starting at the given agent in streaming mode.

        The returned result object contains a method you can use to stream semantic events as they are generated.

        The agent will run in a loop until a final output is generated. The loop runs like so:
            1. The agent is invoked with the given input.
            2. If there is a final output (i.e. the agent produces something of type
                `agent.output_type`, the loop terminates.
            3. If there's a handoff, we run the loop again, with the new agent.
            4. Else, we run tool calls (if any), and re-run the loop.
            In two cases, the agent may raise an exception:
            1. If the max_turns is exceeded, a MaxTurnsExceeded exception is raised.
            2. If a guardrail tripwire is triggered, a GuardrailTripwireTriggered exception is raised.
            Note that only the first agent's input guardrails are run.

        Args:
            starting_agent: The starting agent to run.
            input: The initial input to the agent. You can pass a single string for a user message,
                or a list of input items.
            context: The context to run the agent with.
            max_turns: The maximum number of turns to run the agent for. A turn is defined as one
                AI invocation (including any tool calls that might occur).
            name: The logged name in the tool call.

        Returns:
            A result object that contains data about the run, as well as a method to stream events.

        """  # noqa: D205, E501
        run_agent = ToolHandler.convert_agent_to_func(
            starting_agent,
            tool_name=name,
            max_turns=max_turns,
            streamed=True,
            is_subagent=False,
        )

        async def _agent_wrapper():
            try:
                await run_agent(context, input)
            except MaxTurnsExceeded as e:
                logger.error("Agent exceeded max turns: %s", e)
            except Exception as e:
                raise e

        asyncio.create_task(_agent_wrapper())

        while True:
            message: AgentStreamMessage | ToolCall = await context._message_queue.get()
            yield message
            if message.type != "tool_call" and message.is_stop:
                if message.tool_name == name:
                    break
