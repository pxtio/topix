"""Code Interpreter Agent."""

import uuid

from typing import Any

from agents import (
    Agent,
    AgentHooks,
    CodeInterpreterTool,
    ModelSettings,
    RunContextWrapper,
    Runner,
    Tool,
)
from topix.agents.base import BaseToolAgentManager
from topix.agents.datatypes.context import ReasoningContext
from topix.agents.datatypes.stream import (
    AgentStreamMessage,
    StreamMessageType,
    ToolExecutionState,
)
from topix.agents.datatypes.tools import AgentToolName
from topix.agents.prompt_utils import render_prompt
from topix.agents.utils import format_tool_completed_message, format_tool_start_message

CODE_INTERPRETER_INSTRUCTIONS = (
    "You are an excellent code interpreter. Take care of any calculation, you run the code to ensure correct calculation."
)


class CodeInterpreterAgentHook(AgentHooks):
    """Custom hook to handle the context and results of the code interpreter agent."""

    async def on_end(
        self,
        context: RunContextWrapper[ReasoningContext],
        agent: Agent[ReasoningContext],
        output: Any
    ):
        for tool in agent.tools:
            tool.is_enabled = True

    async def on_tool_end(
        self,
        context: RunContextWrapper[ReasoningContext],
        agent: Agent[ReasoningContext],
        tool: Tool,
        result: str,
    ):
        tool.is_enabled = False


class CodeInterpreter(BaseToolAgentManager):
    """A manager for code interpreter operations.

    This class is responsible for managing the code interpreter agent and its operations.
    """

    name = "Code Interpreter"
    model_name = "gpt-4o"
    prompts = "code_interpreter.jinja"

    def __init__(self):
        
        self.code_interpreter_agent = Agent(
            model=self.model_name,
            name=self.name,
            instructions=render_prompt(self.prompts, default=CODE_INTERPRETER_INSTRUCTIONS),
            tools=[CodeInterpreterTool(tool_config={"type": "code_interpreter", "container": {"type": "auto"}})],
            model_settings=ModelSettings(tool_choice="required", temperature=0.0),
            hooks=CodeInterpreterAgentHook(),
        )

    async def run(self, query: str, max_turns: int = 2) -> str:
        """Run the code interpreter agent with the provided code snippet.

        Args:
            query (str): The code snippet to run.
            max_turns (int): The maximum number of turns for the interpreter. Defaults to 2.

        Returns:
            str: The results of the code interpreter.

        """
        try:
            result = await Runner.run(
                starting_agent=self.code_interpreter_agent,
                input=query,
                max_turns=max_turns,
            )
            return result.final_output
        except Exception:
            return ""

    async def as_tool(
        self,
        wrapper: RunContextWrapper[ReasoningContext],
        query: str,
        max_turns: int = 2
    ) -> str:
        """Run the code interpreter agent as a tool with the provided query.

        Args:
            wrapper (RunContextWrapper[ReasoningContext]): The context wrapper for the agent.
            query (str): The code snippet to run.
            max_turns (int): The maximum number of turns for the interpreter. Defaults to 2.

        Returns:
            str: The results of the code interpreter.

        """
        id_ = uuid.uuid4().hex
        fixed_params = {
            "tool_id": id_,
            "tool_name": AgentToolName.CODE_INTERPRETER,
        }

        await wrapper.context._message_queue.put(
            AgentStreamMessage(
                type=StreamMessageType.STATE,
                execution_state=ToolExecutionState.STARTED,
                status_message=format_tool_start_message(
                    self.name,
                    f"Query: `{query}`."
                ),
                **fixed_params
            )
        )

        # Use streaming:
        res = Runner.run_streamed(
            self.code_interpreter_agent,
            input=query,
            context=wrapper.context,
            max_turns=max_turns,
        )

        async for stream_chunk in self.handle_stream_events(res, **fixed_params):
            await wrapper.context._message_queue.put(stream_chunk)

        await wrapper.context._message_queue.put(
            AgentStreamMessage(
                type=StreamMessageType.STATE,
                execution_state=ToolExecutionState.COMPLETED,
                status_message=format_tool_completed_message(
                    self.name,
                    f"Code completed for query `{query}`."
                ),
                **fixed_params
            )
        )

        wrapper.context.code_interpreter_results.append(res.final_output)
        return res
