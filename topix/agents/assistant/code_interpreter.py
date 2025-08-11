"""Code interpreter Agent."""

import datetime
import logging
import os
import secrets

from typing import Any

from openai import AsyncOpenAI

from agents import (
    Agent,
    AgentHooks,
    CodeInterpreterTool,
    ModelSettings,
    RunContextWrapper,
    RunResult,
    Tool,
)
from topix.agents.base import BaseAgent
from topix.agents.datatypes.context import ReasoningContext
from topix.agents.datatypes.model_enum import ModelEnum
from topix.agents.datatypes.outputs import CodeInterpreterOutput, FileAnnotation
from topix.datatypes.chat.schema import (
    ImageMessageContent,
    TextMessageContent,
)

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

    async def _output_extractor(
        self, context: ReasoningContext, output: RunResult
    ) -> CodeInterpreterOutput:
        """Format the output of the code interpreter agent."""
        media = []
        exectuted_code = ""
        for item in output.new_items:
            if hasattr(item, "raw_item") and hasattr(item.raw_item, "content"):
                for content in item.raw_item.content:
                    if hasattr(content, "annotations"):
                        for annotation in content.annotations:
                            logger.info(f"Saving image: {annotation}")
                            media.append(annotation)

            if item.type == 'tool_call_item':
                if item.raw_item.type == 'code_interpreter_call':
                    exectuted_code += item.raw_item.code

        annotations = await self._return_chatmessage_with_media(media)

        return CodeInterpreterOutput(
            answer=output.final_output,
            executed_code=exectuted_code,
            annotations=annotations
        )

    async def _return_chatmessage_with_media(
        self,
        media: list,
    ) -> list[TextMessageContent | ImageMessageContent]:
        """Return a list of text and image message contents."""
        content = []
        if media:
            client = AsyncOpenAI()
            for item in media:
                file_content = await client.containers.files.content.retrieve(
                    container_id=item.container_id, file_id=item.file_id
                )
                image_data = file_content.read()
                # Generate a unique image ID and ensure it doesn't already exist in the folder
                os.makedirs("data/images", exist_ok=True)
                images_dir = "data/images"
                while True:
                    image_id = secrets.token_hex(3)
                    filepath = os.path.join(images_dir, f"{image_id}.png")
                    if not os.path.exists(filepath):
                        break
                with open(filepath, "wb") as f:
                    f.write(image_data)

                content.append(
                    FileAnnotation(type="image", file_path=filepath, file_id=image_id)
                )
        return content
