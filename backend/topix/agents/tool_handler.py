"""Convert agent/function as FunctionTool object."""

import functools
import inspect
import json

<<<<<<< HEAD
from typing import Any, Awaitable, Callable
=======
from typing import Any, Awaitable, Callable, Type
>>>>>>> 80f0022b0b9e3f79a90f348bb3fae444b5ae4dec

from agents import (
    Agent,
    FunctionTool,
    RunContextWrapper,
    Runner,
    RunResult,
    RunResultStreaming,
    function_tool,
)
from openai.types.responses import (
    ResponseReasoningSummaryTextDeltaEvent,
    ResponseTextDeltaEvent,
)
from pydantic import BaseModel

from topix.agents.datatypes.context import Context
from topix.agents.datatypes.outputs import (
    MemorySearchOutput,
    ToolOutput,
    WebSearchOutput,
)
from topix.agents.datatypes.stream import (
    AgentStreamMessage,
    Content,
    ContentType,
    StreamingMessageType,
)
from topix.agents.datatypes.tool_call import ToolCall, ToolCallState
from topix.utils.common import gen_uid
from topix.utils.web.favicon import fetch_meta_images_batch

RAW_RESPONSE_EVENT = "raw_response_event"


class ToolHandler:
    """Convert agent/function as FunctionTool object."""

    @classmethod
    def convert_agent_to_tool(
        cls,
        agent: Agent,
        tool_name: str,
        tool_description: str = "",
        max_turns: int = 5,
        streamed: bool = False,
<<<<<<< HEAD
=======
        input_type: Type | None = None,
>>>>>>> 80f0022b0b9e3f79a90f348bb3fae444b5ae4dec
    ) -> FunctionTool:
        """Convert agent object to a function.

        Args:
            context: The context for the agent.
            agent: The agent object.
            tool_name: The name of the tool.
            tool_description: The description of the tool.
            max_turns: The maximum number of turns for the tool.
            streamed: Whether to stream the output.
<<<<<<< HEAD
=======
            input_type: The type of the input for the agent. If provided, it will be used to annotate the input in the function signature.
>>>>>>> 80f0022b0b9e3f79a90f348bb3fae444b5ae4dec

        Returns:
            The FunctionTool object.

        """
        return function_tool(
<<<<<<< HEAD
            func=cls.convert_agent_to_func(agent, tool_name, max_turns, streamed),
=======
            func=cls.convert_agent_to_func(agent, tool_name, max_turns, streamed, input_type=input_type),
>>>>>>> 80f0022b0b9e3f79a90f348bb3fae444b5ae4dec
            name_override=tool_name,
            description_override=tool_description if tool_description else None,
        )

    @classmethod
    def convert_func_to_tool(
        cls, func: Callable, tool_name: str, tool_description: str = ""
    ) -> FunctionTool:
        """Convert function to a function tool.

        The first argument of a function must be a RunContextWrapper.
        If tool_id needed, add it as a input parameter, keep the exact name `tool_id`

        Example:
        ```python
        def my_function(
            wrapper: RunContextWrapper[Context],
            tool_id: str,
            input: str,
        ) -> str:
            return input
        function_tool = ToolHandler.convert_func_to_tool(my_function, "my_function")
        ```

        """
        return function_tool(
            func=cls._process_func(func, tool_name),
            name_override=tool_name,
            description_override=tool_description if tool_description else None,
        )

    @classmethod
    def _process_func(
        cls, func: Callable, tool_name: str
    ) -> Callable[[RunContextWrapper[Context], Any], Awaitable[Any]]:
        """Convert function to a function tool."""

        @functools.wraps(func)
        async def wrapped_func(wrapper: RunContextWrapper[Context], *args, **kwargs):
            # log the input:
            context = wrapper.context
            tool_id = gen_uid()

            signature = inspect.signature(func)

            # Check whether in function, tool_id and wrapper context contains:
            if "tool_id" in signature.parameters:
                bound_arguments = signature.bind(
                    wrapper, *args, **kwargs, tool_id=tool_id
                )
            else:
                bound_arguments = signature.bind(wrapper, *args, **kwargs)

            bound_arguments.apply_defaults()
            input = dict(bound_arguments.arguments)

            input = {
                name: value
                for name, value in input.items()
                if not isinstance(value, RunContextWrapper) and not name == "tool_id"
            }

            await cls.log_input(tool_name, tool_id, input, context)
            try:
                output = await func(wrapper, *args, **kwargs)
            except Exception as e:
                raise ValueError(
                    f"Function call failed: {e}. \
                    The first argument of a function must be a RunContextWrapper."
                )
            await cls.log_output(context, tool_name, tool_id, input, output)
            return output

        return wrapped_func

    @classmethod
    def convert_agent_to_func(
        cls,
        agent: Agent,
        tool_name: str,
        max_turns: int = 5,
        streamed: bool = False,
        is_subagent: bool = True,
<<<<<<< HEAD
=======
        input_type: Type | None = None
>>>>>>> 80f0022b0b9e3f79a90f348bb3fae444b5ae4dec
    ) -> Callable[[RunContextWrapper[Context] | Context, Any], Awaitable[Any]]:
        """Convert agent object to a function.

        Args:
            context: The context for the agent.
            agent: The agent object.
            tool_name: The name of the tool.
            tool_description: The description of the tool.
            max_turns: The maximum number of turns for the tool.
            streamed: Whether to stream the output.
            is_subagent: Whether the agent is a subagent.
<<<<<<< HEAD
=======
            input_type: The type of the input for the agent. If provided,
                it will be used to annotate the input in the function signature.
>>>>>>> 80f0022b0b9e3f79a90f348bb3fae444b5ae4dec

        Returns:
            The function that can be later converted as FunctionTool.

        """
<<<<<<< HEAD

=======
>>>>>>> 80f0022b0b9e3f79a90f348bb3fae444b5ae4dec
        async def run(context: Context, input: Any) -> Any:
            """Execute the agent with the provided context and input.

            Args:
                context: The context for the agent.
                input: The input data for the agent

            Returns:
                The final output from the agent as a string.

            """
            # Log the input message:
            tool_id = gen_uid()
            await cls.log_input(tool_name, tool_id, input, context)

            # Run the agent
            agent_input = await agent._input_formatter(context, input)
            if streamed:
                response = Runner.run_streamed(
                    starting_agent=agent,
                    input=agent_input,
                    context=context,
                    max_turns=max_turns,
                )
                await cls.process_llm_streaming(context, response, tool_id, tool_name)
            else:
                response = await Runner.run(agent, agent_input, context=context)

            try:
                final_output = await agent._output_extractor(context, response)
            except Exception as e:
                raise ValueError(
                    f"An error occurred in `agent._output_extractor`: {e}. \n"
                    "To define a custom _output_extractor, "
                    "ensure it uses the following parameters: "
                    "context: Context, output: RunResult | RunResultStreaming"
                )

            # Log the output message:
            await cls.log_output(
                context,
                tool_name,
                tool_id,
                input,
                final_output,
                response,
            )

            return final_output

        if is_subagent:

            async def run_agent(
                wrapper: RunContextWrapper[Context], input: str
            ) -> ToolOutput:
                return await run(wrapper.context, input)
<<<<<<< HEAD

            return run_agent

=======
            if input_type is not None:
                run_agent.__annotations__["input"] = input_type
            return run_agent

        if input_type is not None:
            run.__annotations__["input"] = input_type
>>>>>>> 80f0022b0b9e3f79a90f348bb3fae444b5ae4dec
        return run

    @classmethod
    async def log_input(
        cls,
        tool_name: str,
        tool_id: str,
        input: Any,
        context: Context,
    ) -> str:
        """Log the input of either agent or callable function.

        Args:
            tool_name: The name of the tool.
            tool_id: The id of the tool.
            input: The input data for the agent/function.
            context: The context for the agent/function.

        Returns:
            The tool_id.

        """
        if isinstance(input, BaseModel):
            input = input.model_dump()
        await context._message_queue.put(
            AgentStreamMessage(
                content=Content(
                    type=ContentType.STATUS,
                    text=json.dumps(input, indent=2),
                ),
                is_stop=False,
                tool_id=tool_id,
                tool_name=tool_name,
            )
        )
        return tool_id

    @classmethod
    async def log_output(
        cls,
        context: Context,
        tool_name: str,
        tool_id: str,
        input: Any,
        output: ToolOutput,
        llm_response: RunResultStreaming | RunResult | None = None,
    ):
        """Log the output of either agent or callable function."""
        # Extract the thoughts message from the raw response:
        await cls._process_tool_output(context, output, tool_id, tool_name)

        if llm_response:
            thought = ToolHandler._extract_thoughts(llm_response)
        else:
            thought = ""

        toolcall_output = ToolCall(
            id=tool_id,
            name=tool_name,
            arguments={"input": input},  # TODO: input = input
            thought=thought,
            output=output,
            state=ToolCallState.COMPLETED,
        )

        context.tool_calls.append(toolcall_output)
        await context._message_queue.put(toolcall_output)

        await context._message_queue.put(
            AgentStreamMessage(
                content=Content(
                    type=ContentType.STATUS,
                    text="",
                ),
                is_stop=True,
                tool_id=tool_id,
                tool_name=tool_name,
            )
        )

    @classmethod
    async def _process_tool_output(
        cls,
        context: Context,
        output: ToolOutput,
        tool_id: str,
        tool_name: str,
    ) -> None:
        """Process the output for streaming messages."""
        annotations = []

        if isinstance(output, WebSearchOutput):
            # Fetch favicons and cover images for the search results
            search_results = output.search_results
            meta_images = await fetch_meta_images_batch(
                [result.url for result in search_results]
            )
            new_results = []
            for result in search_results:
                if result.url in meta_images:
                    result.favicon = (
                        str(meta_images[result.url].favicon)
                        if meta_images[result.url].favicon
                        else None
                    )
                    result.cover_image = (
                        str(meta_images[result.url].cover_image)
                        if meta_images[result.url].cover_image
                        else None
                    )
                new_result = result.model_copy()
                new_result.content = new_result.content[:500] if new_result.content else None
                new_results.append(new_result)
            annotations = new_results
        elif isinstance(output, MemorySearchOutput):
            annotations = output.references
        else:
            pass

        if annotations:
            await context._message_queue.put(
                AgentStreamMessage(
                    tool_id=tool_id,
                    tool_name=tool_name,
                    content=Content(annotations=annotations),
                )
            )

    @classmethod
    async def process_llm_streaming(
        cls,
        context: Context,
        stream_response: RunResultStreaming,
        tool_id: str,
        tool_name: str,
    ) -> None:
        """Process the streaming response from the LLM.

        Args:
            context: The context for the agent.
            stream_response: The streaming response from the LLM from Runner.run_streamed
            tool_id: The id of the tool.
            tool_name: The name of the tool.

        """
        event_type_map = {
            ResponseTextDeltaEvent: StreamingMessageType.STREAM_MESSAGE,
            ResponseReasoningSummaryTextDeltaEvent: StreamingMessageType.STREAM_REASONING_MESSAGE,
        }

        async for event in stream_response.stream_events():
            if event.type == RAW_RESPONSE_EVENT:
                for cls, msg_type in event_type_map.items():
                    if isinstance(event.data, cls):
                        msg = AgentStreamMessage(
                            type=msg_type,
                            content=Content(
                                type=ContentType.TOKEN, text=event.data.delta
                            ),
                            tool_id=tool_id,
                            tool_name=tool_name,
                            is_stop=False,
                        )
                        await context._message_queue.put(msg)

    @classmethod
    def _extract_thoughts(cls, response: RunResult | RunResultStreaming) -> str:
        thought = ""
        for raw_response in response.raw_responses:
            for message in raw_response.output:
                if message.type == "reasoning":
                    if message.summary:
                        thought += "\n\n".join(
                            summary.text for summary in message.summary
                        )
        return thought
