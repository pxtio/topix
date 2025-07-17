"""Key Points Extraction Agent for Mindmap Generation."""

import logging
import uuid

from agents import Agent, ModelSettings, RunContextWrapper, Runner
from topix.agents.base import BaseAgentManager
from topix.agents.datatypes.context import ReasoningContext
from topix.agents.datatypes.stream import AgentStreamMessage, ToolExecutionState
from topix.agents.datatypes.tools import AgentToolName
from topix.agents.prompt_utils import render_prompt
from topix.agents.utils import format_tool_completed_message, format_tool_start_message

logger = logging.getLogger(__name__)


class KeyPointsExtract(BaseAgentManager):
    """Key Points Extraction Agent."""

    name = "Key Points Extraction"
    model_name = "gpt-4.1-mini"
    prompts = "key_points_extraction.jinja"

    def __init__(self):
        """Initialize the Key Points Extraction agent."""
        self.agent = Agent[ReasoningContext](
            name=self.name,
            instructions=render_prompt(self.prompts),
            model=self.model_name,
            output_type=str,
            model_settings=ModelSettings(temperature=0.1)
        )

    async def run(self, context: ReasoningContext, answer: str) -> str:
        """Run the Key Points Extraction agent with the provided context and answer."""
        try:
            result = await Runner.run(
                starting_agent=self.agent,
                input=answer,
                max_turns=1
            )
            return result.final_output
        except Exception as e:
            logger.warning(
                "Error running Key Points Extraction agent: %s",
                str(e),
                exc_info=True
            )
            return ""

    async def as_tool(self, wrapper: RunContextWrapper[ReasoningContext], answer: str) -> str:
        """Run the Key Points Extraction agent as a tool with the provided answer."""
        id_ = uuid.uuid4().hex
        await wrapper.context._message_queue.put(
            AgentStreamMessage(
                tool_id=id_,
                tool_name=AgentToolName.KEY_POINTS_EXTRACT,
                execution_state=ToolExecutionState.STARTED,
                status_message=format_tool_start_message(self.name),
            )
        )

        res = await Runner.run_streamed(
            starting_agent=self.agent,
            input=answer,
            context=wrapper.context,
            max_turns=1
        )

        async for stream_chunk in self.handle_stream_events(
            res,
            tool_id=id_,
            tool_name=AgentToolName.KEY_POINTS_EXTRACT
        ):
            await wrapper.context._message_queue.put(stream_chunk)

        await wrapper.context._message_queue.put(
            AgentStreamMessage(
                tool_id=id_,
                tool_name=AgentToolName.KEY_POINTS_EXTRACT,
                execution_state=ToolExecutionState.COMPLETED,
                status_message=format_tool_completed_message(self.name)
            )
        )
