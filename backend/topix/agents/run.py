"""Agent runner supporting streaming mode."""
import asyncio

from collections.abc import AsyncGenerator
from typing import Any

from agents import RunConfig, RunHooks, Runner, TContext, TResponseInputItem
from agents.memory import Session
from pydantic import BaseModel

from topix.agents.base import BaseAgent
from topix.agents.datatypes.context import Context
from topix.agents.datatypes.stream import AgentStreamMessage
from topix.agents.datatypes.tool_call import ToolCall
from topix.agents.datatypes.tools import AgentToolName
from topix.agents.utils.tools import tool_execution_handler

DEFAULT_MAX_TURNS = 8


class AgentRunner:
    """Agent runner supporting streaming mode."""

    @classmethod
    async def run(
        cls,
        starting_agent: BaseAgent,
        input: str | list[TResponseInputItem] | BaseModel,
        *,
        context: TContext | None = None,
        max_turns: int = DEFAULT_MAX_TURNS,
        hooks: RunHooks[TContext] | None = None,
        run_config: RunConfig | None = None,
        previous_response_id: str | None = None,
        session: Session | None = None,
    ) -> Any:
        """Run a workflow starting at the given agent. The agent will run in a loop until a final output is generated.

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
            hooks: An object that receives callbacks on various lifecycle events.
            run_config: Global settings for the entire agent run.
            previous_response_id: The ID of the previous response, if using OpenAI models via the
                Responses API, this allows you to skip passing in input from the previous turn.
            session: The session to use for the run.

        Returns:
            A run result containing all the inputs, guardrail results and the output of the last agent. Agents may perform handoffs, so we don't know the specific type of the output.

        """  # noqa: E501
        if isinstance(input, str) or isinstance(input, BaseModel):
            input = await starting_agent._input_formatter(context=context, input=input)

        if not input:
            return None

        res = await Runner.run(
            starting_agent,
            input,
            context=context,
            max_turns=max_turns,
            hooks=hooks,
            run_config=run_config,
            previous_response_id=previous_response_id,
            session=session,
        )

        return await starting_agent._output_extractor(context=context, output=res)

    @classmethod
    async def run_streamed(
        cls,
        starting_agent: BaseAgent,
        input: str | list[TResponseInputItem] | BaseModel,
        context: Context,
        max_turns: int = DEFAULT_MAX_TURNS,
        hooks: RunHooks[TContext] | None = None,
        run_config: RunConfig | None = None,
        previous_response_id: str | None = None,
        session: Session | None = None
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
            hooks: An object that receives callbacks on various lifecycle events.
            run_config: Global settings for the entire agent run.
            previous_response_id: The ID of the previous response, if using OpenAI models via the
                Responses API, this allows you to skip passing in input from the previous turn.
            session: The session to use for the run.

        Returns:
            A result object that contains data about the run, as well as a method to stream events.

        """  # noqa: D205, E501
        if isinstance(input, str):
            input_msg = input
        else:
            input_msg = ""

        input = await starting_agent._input_formatter(context=context, input=input)

        if not input:
            return

        async def stream_events():
            async with tool_execution_handler(
                context, tool_name=AgentToolName.RAW_MESSAGE, formatted_input=input_msg
            ) as tool_id:
                res = Runner.run_streamed(
                    starting_agent,
                    input,
                    context=context,
                    max_turns=max_turns,
                    hooks=hooks,
                    run_config=run_config,
                    previous_response_id=previous_response_id,
                    session=session,
                )
                async for stream_chunk in starting_agent._handle_stream_events(
                    res, tool_id=tool_id, tool_name=AgentToolName.RAW_MESSAGE
                ):
                    await context._message_queue.put(stream_chunk)

        asyncio.create_task(stream_events())

        while True:
            message: AgentStreamMessage | ToolCall = await context._message_queue.get()
            yield message
            if message.type != "tool_call" and message.is_stop:
                if message.tool_name == AgentToolName.RAW_MESSAGE:
                    break
