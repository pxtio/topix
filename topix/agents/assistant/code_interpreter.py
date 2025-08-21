"""Code interpreter Agent."""

import datetime
import logging
import os
import secrets
from enum import Enum
from typing import Any, List  # , Optional
from e2b_code_interpreter import Sandbox

from openai import AsyncOpenAI
from pydantic import BaseModel

from agents import (
    Agent,
    AgentHooks,
    CodeInterpreterTool,
    ModelSettings,
    RunContextWrapper,
    RunResult,
    Tool,
    function_tool,
)
from agents.mcp import MCPServerStdio  # , create_static_tool_filter
from topix.agents.base import BaseAgent
from topix.agents.datatypes.context import ReasoningContext
from topix.agents.datatypes.model_enum import ModelEnum
from topix.agents.datatypes.outputs import CodeInterpreterOutput, FileAnnotation
from topix.datatypes.chat.schema import (
    ImageMessageContent,
    TextMessageContent,
)

logger = logging.getLogger(__name__)


class CodeInterpreterBackend(str, Enum):
    """Available code interpreter backends."""
    OPENAI = "openai"
    E2B = "e2b"
    MCP = "mcp"


class CodeInput(BaseModel):
    """Input model for code execution."""
    code: str


# JSON schema for tool parameters to avoid runtime typing issues with external Tool
CODE_INPUT_SCHEMA = {
    "type": "object",
    "properties": {
        "code": {
            "type": "string",
            "description": "Python code to execute",
        }
    },
    "required": ["code"],
}


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
    """An Agent for code interpretation operations.

    This class is responsible for managing the code interpreter agent and its operations.
    Supports multiple backends: OpenAI Code Interpreter, E2B Sandbox, and MCP Run Python.
    """

    def __init__(
        self,
        model: str = ModelEnum.OpenAI.GPT_4O,
        instructions_template: str = "code_interpreter.jinja",
        model_settings: ModelSettings | None = None,
        backend: CodeInterpreterBackend | None = CodeInterpreterBackend.OPENAI,
        mcp_servers: List[MCPServerStdio] = [],
    ):
        """Initialize the code interpreter agent.

        Args:
            model: The model to use for the agent
            instructions_template: Template for agent instructions
            model_settings: Model configuration settings
            backend: Code execution backend to use
            e2b_api_key: E2B API key (required if using E2B backend)
        """
        name = "Code Interpreter"
        instructions_dict = {"time": datetime.datetime.now().strftime("%Y-%m-%d")}
        instructions = self._render_prompt(instructions_template, **instructions_dict)

        # Initialize backend-specific tools and MCP servers
        tools = []

        if backend == CodeInterpreterBackend.OPENAI:
            tools = [
                CodeInterpreterTool(
                    tool_config={"type": "code_interpreter", "container": {"type": "auto"}}
                )
            ]
        elif backend == CodeInterpreterBackend.E2B:
            tools = [self._create_e2b_tool()]  # e2b_api_key
        # elif backend == CodeInterpreterBackend.MCP:
        #     # Use MCP tool instead of server to avoid connection issues
        #     python_mcp_server = self.add_stdio_server(
        #         name="Python Executor MCP",
        #         command="/home/louis/.deno/bin/deno",
        #         args=[
        #             "run",
        #             "--allow-net", "--allow-read=node_modules", "--allow-write=node_modules",
        #             "--node-modules-dir=auto",
        #             "jsr:@pydantic/mcp-run-python", "stdio"
        #         ],
        #     )
            # await python_mcp_server.connect()
            # mcp_servers.append(python_mcp_server)

        hooks = CodeInterpreterAgentHook()

        if model_settings is None:
            model_settings = ModelSettings(temperature=0.01)

        super().__init__(
            name=name,
            model=model,
            model_settings=model_settings,
            instructions=instructions,
            tools=tools,
            mcp_servers=mcp_servers,
            hooks=hooks,
        )

        super().__post_init__()

    def _create_e2b_tool(self) -> Tool:
        """Create E2B code execution tool."""

        async def execute_python_e2b(code: str) -> str:
            """Execute Python code in E2B sandbox."""
            try:
                with Sandbox() as sandbox:
                    execution = sandbox.run_code(code)
                    result = f"Output: {execution.text}\n"
                    if execution.logs.stdout:
                        result += f"Logs: {execution.logs.stdout}\n"
                    if execution.logs.stderr:
                        result += f"Errors: {execution.logs.stderr}\n"
                    return result
            except Exception as e:
                return f"E2B execution error: {str(e)}"

        @function_tool(
            name_override="execute_python_e2b",
            description_override="Execute Python code in a secure E2B sandbox (use for ML, data analysis, file operations and calculations)",
        )
        async def execute_python_e2b_tool(
            context: RunContextWrapper[ReasoningContext], code: str
        ) -> str:
            return await execute_python_e2b(code)

        return execute_python_e2b_tool

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
                if hasattr(item.raw_item, 'type'):
                    if item.raw_item.type == 'code_interpreter_call':
                        exectuted_code += item.raw_item.code
                    elif item.raw_item.type == 'tool_call' and hasattr(item.raw_item, 'name'):
                        # Handle custom tool calls (E2B, MCP)
                        if item.raw_item.name in ['execute_python_e2b', 'execute_python_mcp']:
                            if hasattr(item.raw_item, 'arguments') and item.raw_item.arguments:
                                exectuted_code += item.raw_item.arguments.get('code', '')

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
