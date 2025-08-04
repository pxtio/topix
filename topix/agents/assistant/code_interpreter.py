"""Web Search Agent."""

import datetime
import logging

from typing import Any

from openai import OpenAI
from agents import (
    Agent,
    AgentHooks,
    CodeInterpreterTool,
    # ItemHelpers,
    ModelSettings,
    RunContextWrapper,
    RunResult,
    Tool,
)
from topix.agents.base import BaseAgent
from topix.agents.datatypes.context import ReasoningContext
from topix.agents.datatypes.model_enum import ModelEnum

logger = logging.getLogger(__name__)


class CodeInterpreterAgentHook(AgentHooks):
    """Custom hook to handle the context and results of the Code Interpreter agent."""

    async def on_end(
        self,
        context: RunContextWrapper[ReasoningContext],
        agent: Agent[ReasoningContext],
        output: Any,
    ):
        """Initialize the context for the web search agent."""
        # Initialize the context if not already done
        for tool in agent.tools:
            tool.is_enabled = True

    async def on_tool_end(
        self,
        context: RunContextWrapper[ReasoningContext],
        agent: Agent[ReasoningContext],
        tool: Tool,
        result: str,
    ):
        """Handle tool calls and update the context with the results."""
        tool.is_enabled = False


class CodeInterpreter(BaseAgent):
    """An Agent for web search operations.

    This class is responsible for managing the web search agent and its operations.
    """

    def __init__(
        self,
        model: str = ModelEnum.OpenAI.GPT_4O,
        instructions_template: str = "code_interpreter.jinja",
        model_settings: ModelSettings | None = None,
    ):
        """Initialize the gent."""
        name = "Code Interpreter"
        instructions_dict = {"time": datetime.datetime.now().strftime("%Y-%m-%d")}
        instructions = self._render_prompt(instructions_template, **instructions_dict)
        tools = [
            CodeInterpreterTool(
                tool_config={"type": "code_interpreter", "container": {"type": "auto"}}
            )
        ]
        hooks = CodeInterpreterAgentHook()

        if model_settings is None:
            model_settings = ModelSettings(temperature=0.01)

        super().__init__(
            name=name,
            model=model,
            model_settings=model_settings,
            instructions=instructions,
            tools=tools,
            hooks=hooks,
        )

        super().__post_init__()

    async def _output_extractor(self, context: ReasoningContext, output: RunResult) -> str:
        """Format the output of the code interpreter agent."""
        media = ""
        for item in output.new_items:
            if hasattr(item, 'raw_item') and hasattr(item.raw_item, 'content'):
                for content in item.raw_item.content:
                    if hasattr(content, 'annotations'):
                        for annotation in content.annotations:
                            logger.info(f"Saving image: {annotation}")
                            media += save_generated_image(annotation) + " "
        return output.final_output + " " + media


def save_generated_image(
    media
) -> str:
    """Save an image to disk, returning the file path"""

    client = OpenAI()
    file_content = client.containers.files.content.retrieve(
        container_id=media.container_id, file_id=media.file_id
    )
    image_data = file_content.read()
    filepath = f"data/images/{media.file_id}.png"
    with open(filepath, "wb") as f:
        f.write(image_data)

    return f"[{filepath}]({media.filename})"
