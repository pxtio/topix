"""Base class for agent managers in the Topix application."""

import logging

from dataclasses import dataclass
from pathlib import Path
from typing import Any, AsyncGenerator

import litellm

from agents import (
    Agent,
    ModelSettings,
    RunResult,
    RunResultStreaming,
    Tool,
)
from agents.extensions.models.litellm_model import LitellmModel
from jinja2 import Template
from openai.types.responses import (
    ResponseReasoningSummaryTextDeltaEvent,
    ResponseTextDeltaEvent,
)

from topix.agents.config import BaseAgentConfig
from topix.agents.datatypes.context import Context
from topix.agents.datatypes.model_enum import (
    support_penalties,
    support_reasoning,
    support_temperature,
)
from topix.agents.datatypes.outputs import ToolOutput
from topix.agents.datatypes.stream import (
    AgentStreamMessage,
    Content,
    ContentType,
    StreamingMessageType,
)
from topix.agents.datatypes.tools import AgentToolName
from topix.agents.tool_handler import ToolHandler

logger = logging.getLogger(__name__)
litellm.drop_params = True

RAW_RESPONSE_EVENT = "raw_response_event"
PROMPT_DIR = Path(__file__).parent.parent / "prompts"


@dataclass
class BaseAgent(Agent[Context]):
    """Base class for agents. Inherit from Openai Agent."""

    def __post_init__(self):
        """Automatically load Litellm Model if not openai's."""
        # if the model does not support temperature, set it to None
        self.model_settings = self._adjust_model_settings(
            self.model, self.model_settings
        )

        if isinstance(self.model, str):
            model_type = self.model.split("/")[0]
            if model_type != "openai":
                self.model = LitellmModel(self.model)

    def _adjust_model_settings(
        self, model: str, model_settings: ModelSettings | None
    ) -> ModelSettings:
        model_settings = model_settings or ModelSettings()

        if model_settings.max_tokens is None:
            model_settings.max_tokens = 8000

        if support_reasoning(model):
            if not model_settings.reasoning:
                model_settings.reasoning = {"effort": "low", "summary": "auto"}
        else:
            model_settings.reasoning = None

        if support_temperature(model):
            if not model_settings.temperature:
                model_settings.temperature = 0.01
        else:
            model_settings.temperature = None

        if support_penalties(model):
            if model_settings.frequency_penalty is None:
                model_settings.frequency_penalty = 0.2

        return model_settings

    @classmethod
    def from_config(cls, config: BaseAgentConfig) -> "BaseAgent":
        """Create an instance of BaseAgent from configuration."""
        kwargs = {key: getattr(config, key) for key in config.model_fields_set}
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
        return ToolHandler.convert_agent_to_tool(
            self, tool_name, tool_description, max_turns, streamed
        )

    async def _as_tool_hook(
        self, context: Context, input: Any, tool_id: str
    ) -> Any | None:
        return None

    async def _input_formatter(
        self, context: Context, input: Any
    ) -> str | list[dict[str, str]]:
        if isinstance(input, (str, list)):
            return input
        raise NotImplementedError("_input_formatter method is not implemented")

    async def _output_extractor(
        self, context: Context, output: RunResult | RunResultStreaming
    ) -> ToolOutput:
        """Extract the final output from the agent's response."""
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
        event_type_map = {
            ResponseTextDeltaEvent: StreamingMessageType.STREAM_MESSAGE,
            ResponseReasoningSummaryTextDeltaEvent: StreamingMessageType.STREAM_REASONING_MESSAGE,
        }

        async for event in stream_response.stream_events():
            if event.type == RAW_RESPONSE_EVENT:
                for cls, msg_type in event_type_map.items():
                    if isinstance(event.data, cls):
                        yield AgentStreamMessage(
                            type=msg_type,
                            content=Content(
                                type=ContentType.TOKEN, text=event.data.delta
                            ),
                            **fixed_params,
                            is_stop=False,
                        )

    def force_tool(
        self,
        tool_name: AgentToolName,
    ):
        """Force the agent to use a specific tool."""
        tool = None
        for t in self.tools:
            if t.name == tool_name:
                tool = t
                break

        if tool is None:
            raise ValueError(f"Tool {tool_name} not found in agent {self.name}")

        self.model_settings.tool_choice = tool_name
        tool.is_enabled = True

    def set_enabled_tools(self, tool_names: list[AgentToolName]):
        """Set Agent tool from `tool_names`, other tools will be disabled."""
        for tool in self.tools:
            if tool.name in tool_names:
                tool.is_enabled = True
            else:
                tool.is_enabled = False
