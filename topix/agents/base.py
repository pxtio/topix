"""Base class for agent managers in the Topix application."""

from pathlib import Path
from typing import Any, AsyncGenerator, Generic, TypeVar

from jinja2 import Template

from openai.types.responses import ResponseTextDeltaEvent
from pydantic import BaseModel

from agents import (
    Agent,
    RunContextWrapper,
    Runner,
    RunResult,
    RunResultStreaming,
    Tool,
    function_tool,
)
from agents.extensions.models.litellm_model import LitellmModel
from topix.agents.datatypes.context import Context
from topix.agents.datatypes.stream import (
    AgentStreamMessage,
    StreamDelta,
    StreamMessageType,
)
from topix.agents.utils import tool_execution_handler

RAW_RESPONSE_EVENT = "raw_response_event"
PROMPT_DIR = Path(__file__).parent.parent / "prompts"
TInput = TypeVar("TInput", BaseModel, str)


class BaseAgent(Agent[Context], Generic[TInput]):
    """Base class for agents. Inherit from Openai Agent"""

    def __post_init__(self):
        """
        Automatically load Litellm Model if model is a string
        """
        if isinstance(self.model, str):
            model_type = self.model.split("/")[0]
            if model_type != "openai":
                self.model = LitellmModel(self.model)

    def as_tool(
        self,
        tool_name: str | None = None,
        tool_description: str | None = None,
        max_turns: int = 5,
        streamed: bool = False,
        start_msg: str | None = None
    ) -> Tool:
        """Transform this agent into a tool, callable by other agents.

        This is different from handoffs in two ways:
        1. In handoffs, the new agent receives the conversation history. In this tool,
        the new agent receives generated input.
        2. In handoffs, the new agent takes over the conversation. In this tool,
        the new agent is called as a tool, and the conversation is continued by
        the original agent.

        Args:
            tool_name: The name of the tool. If not provided, the agent's name used.
            tool_description: The description of the tool
            custom_input_formatter: A function that formats the input for the agent
                using context.
            custom_output_extractor: A function that extracts the output from the agent.
            If not provided, the last message from the agent will be used.
            max_turns: The maximum number of turns for the tool.
            streamed: Whether to stream the output.
            start_msg: The start message for the tool.

        Returns:
            Tool: The tool that can be used by other agents.
        """

        @function_tool(
            name_override=tool_name,
            description_override=tool_description or "",
        )
        async def run_agent(context: RunContextWrapper[Context], input: TInput) -> str:
            """
            Execute the agent with the provided context and input.

            Args:
                context: The context wrapper for the agent.
                input: The input data for the agent, can be a string or a model instance

            Returns:
                The final output from the agent as a string.
            """
            # Determine the name to override, using tool_name or defaulting
            # to the agent's name
            name_override = tool_name or self.name

            # Format input message based on its type
            msg = start_msg
            if msg is None:
                if isinstance(input, str):
                    msg = input
                else:
                    msg = "\n".join(
                        f"{key}: {value}" for key, value in input.model_dump().items()
                    )

            # Handle tool execution within an async context manager
            async with tool_execution_handler(context, name_override, msg) as p:
                # Handle tool hooks, for specialized behavior
                hook_result = await self._as_tool_hook(
                    context.context, input, tool_id=p['tool_id']
                )
                if hook_result is not None:
                    return hook_result
                # Format the input for the agent
                input_str = await self._input_formatter(context.context, input)
                if streamed:
                    # Run the agent in streaming mode
                    output = Runner.run_streamed(
                        self,
                        context=context.context,
                        input=input_str,
                        max_turns=max_turns,
                    )
                    # Process and forward stream events
                    async for stream_chunk in self._handle_stream_events(output, **p):
                        await context.context._message_queue.put(stream_chunk)
                else:
                    # Run the agent and get the result
                    output: RunResult = await Runner.run(
                        starting_agent=self,
                        input=input_str,
                        context=context.context,
                        max_turns=max_turns,
                    )

            # Extract the final output from the agent
            output = await self._output_extractor(context.context, output)
            return output

        return run_agent

    async def _as_tool_hook(
        self,
        context: Context,
        input: TInput,
        tool_id: str
    ) -> Any | None:
        return None

    async def _input_formatter(self, context: Context, input: TInput) -> str:
        if isinstance(input, str):
            return input
        else:
            raise NotImplementedError

    async def _output_extractor(self, context: Context, output: RunResult) -> Any:
        return output.final_output

    @staticmethod
    def is_delta(message: str | AgentStreamMessage) -> bool:
        """Check if the message is a delta."""
        return (
            isinstance(message, AgentStreamMessage)
            and message.type == StreamMessageType.TOKEN
        )

    @classmethod
    def _render_prompt(cls, filename: str, **kwargs) -> str:
        """Render a prompt template with the given parameters."""
        """Load a prompt template from the prompts directory."""
        with open(PROMPT_DIR / filename, "r", encoding="utf-8") as f:
            template_str = f.read()
            template: Template = Template(template_str)
            return template.render(**kwargs)

    async def _handle_stream_events(
        self, stream_response: RunResultStreaming, **fixed_params
    ) -> AsyncGenerator[AgentStreamMessage, None]:
        """Handle streaming events from the agent."""
        async for event in stream_response.stream_events():
            if event.type == RAW_RESPONSE_EVENT and isinstance(
                event.data, ResponseTextDeltaEvent
            ):
                yield AgentStreamMessage(
                    type=StreamMessageType.TOKEN,
                    delta=StreamDelta(content=event.data.delta),
                    **fixed_params,
                )
