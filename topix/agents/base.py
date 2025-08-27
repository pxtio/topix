"""Base class for agent managers in the Topix application."""

import logging

from dataclasses import dataclass
from pathlib import Path
from typing import Any, AsyncGenerator

from jinja2 import Template
from openai.types.responses import ResponseTextDeltaEvent

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
from topix.agents.config import BaseAgentConfig
from topix.agents.datatypes.context import Context
from topix.agents.datatypes.model_enum import support_temperature
from topix.agents.datatypes.outputs import ToolOutput
from topix.agents.datatypes.stream import AgentStreamMessage, Content, ContentType
from topix.agents.utils import tool_execution_handler
from topix.datatypes.chat.tool_call import ToolCall, ToolCallState

logger = logging.getLogger(__name__)

RAW_RESPONSE_EVENT = "raw_response_event"
PROMPT_DIR = Path(__file__).parent.parent / "prompts"


@dataclass
class BaseAgent(Agent[Context]):
    """Base class for agents. Inherit from Openai Agent."""

    def __post_init__(self):
        """Automatically load Litellm Model if not openai's."""
        # if the model does not support temperature, set it to None
        if not support_temperature(self.model):
            self.model_settings.temperature = None

        if isinstance(self.model, str):
            model_type = self.model.split("/")[0]
            if model_type != "openai":
                self.model = LitellmModel(self.model)

    @classmethod
    def from_config(cls, config: BaseAgentConfig) -> "BaseAgent":
        """Create an instance of BaseAgent from configuration."""
        kwargs = {
            key: getattr(config, key)
            for key in config.model_fields_set
        }
        return cls(**kwargs)

    def as_tool(
        self,
        tool_name: str | None = None,
        tool_description: str | None = None,
        max_turns: int = 8,
        streamed: bool = False,
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
        name_override = tool_name or self.name

        @function_tool(
            name_override=name_override,
            description_override=tool_description or "",
        )
        async def run_agent(context: RunContextWrapper[Context], input: str) -> str:
            """Execute the agent with the provided context and input.

            Args:
                context: The context wrapper for the agent.
                input: The input data for the agent, can be a string or a model instance

            Returns:
                The final output from the agent as a string.

            """
            # Determine the name to override, using tool_name or defaulting
            # to the agent's name

            # Format the input for the agent
            input_str = await self._input_formatter(context.context, input)
            async with tool_execution_handler(
                context.context, name_override, input
            ) as tool_id:
                # Handle tool execution within an async context manager
                hook_result = await self._as_tool_hook(
                    context.context, input, tool_id=tool_id
                )
                if hook_result is not None:
                    return hook_result

                if streamed:
                    # Run the agent in streaming mode
                    output = Runner.run_streamed(
                        self,
                        context=context.context,
                        input=input_str,
                        max_turns=max_turns,
                    )
                    # Process and forward stream events
                    p = {"tool_id": tool_id, "tool_name": name_override}
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
            output: ToolOutput = await self._output_extractor(context.context, output)

            context.context.tool_calls.append(
                ToolCall(
                    id=tool_id,
                    name=name_override,
                    arguments={"input": input},
                    output=output,
                    state=ToolCallState.COMPLETED
                )
            )

            return str(output)

        return run_agent

    async def _as_tool_hook(
        self, context: Context, input: Any, tool_id: str
    ) -> Any | None:
        return None

    async def _input_formatter(
        self, context: Context, input: Any
    ) -> str | list[dict[str, str]]:
        if isinstance(input, str):
            return input
        elif isinstance(input, list):
            return input
        raise NotImplementedError("_input_formatter method is not implemented")

    async def _output_extractor(
        self, context: Context, output: RunResult
    ) -> ToolOutput:
        return output.final_output

    @classmethod
    def _render_prompt(cls, filename: str, **kwargs) -> str:
        """Render a prompt template with the given parameters.

        Load a prompt template from the prompts directory.
        """
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
                    content=Content(type=ContentType.TOKEN, text=event.data.delta),
                    **fixed_params,
                    is_stop=False,
                )

    def activate_tool(self, tool_name: str) -> None:
        """Activate a tool by name.

        Args:
            tool_name (str): The name of the tool to activate.

        """
        activated = False
        for tool in self.tools:
            if tool.name == tool_name:
                tool.is_enabled = True
                activated = True

        if not activated:
            raise ValueError(f"Tool {tool_name} not found in agent {self.name}")

        self.model_settings.tool_choice = tool_name

    def deactivate_tool(self, tool_name: str) -> None:
        """Deactivate a tool by name.

        Args:
            tool_name (str): The name of the tool to deactivate.

        """
        deactivated = False
        for tool in self.tools:
            if tool.name == tool_name:
                tool.is_enabled = False
                deactivated = True

        self.model_settings.tool_choice = "auto"

        if not deactivated:
            raise ValueError(f"Tool {tool_name} not found in agent {self.name}")
