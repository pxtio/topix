""" "Utility functions for agents."""

from contextlib import asynccontextmanager
import uuid

from agents import RunContextWrapper

from topix.agents.datatypes.context import Context
from topix.agents.datatypes.stream import (
    AgentStreamMessage,
    ToolExecutionState,
    StreamMessageType,
)


def format_tool_start_message(tool_name: str, message: str | None = None) -> str:
    """Format the start message for a tool execution."""
    msg = f"🚀 [Tool Start] `{tool_name}`"
    if message:
        return f"{msg}\n  ↪ {message}"
    return msg


def format_tool_completed_message(tool_name: str, message: str | None = None) -> str:
    """Format the completed message for a tool execution."""
    msg = f"✅ [Tool Completed] `{tool_name}`"
    if message:
        return f"{msg}\n  ↪ {message}"
    return msg


def format_tool_failed_message(tool_name: str, message: str | None = None) -> str:
    """Format the failed message for a tool execution."""
    msg = f"❌ [Tool Failed] `{tool_name}`"
    if message:
        return f"{msg}\n  ↪ {message}"
    return msg


@asynccontextmanager
async def tool_execution_handler(
    context: RunContextWrapper[Context], tool_name, input_str
):
    """
    async context manager to handle tool execution
    """
    fixed_params = {
        "tool_id": uuid.uuid4().hex,
        "tool_name": tool_name,
    }

    # __aenter__:
    await context.context._message_queue.put(
        AgentStreamMessage(
            type=StreamMessageType.STATE,
            execution_state=ToolExecutionState.STARTED,
            status_message=format_tool_start_message(
                tool_name, f"Calling with: `{input_str}`."
            ),
            **fixed_params,
        )
    )

    try:
        yield fixed_params
    except Exception as e:
        await context.context._message_queue.put(
            AgentStreamMessage(
                type=StreamMessageType.STATE,
                execution_state=ToolExecutionState.FAILED,
                status_message=format_tool_completed_message(
                    tool_name, f"Failed with error: {e}"
                ),
                **fixed_params,
            )
        )
        raise e
    else:
        # __aexit__:
        await context.context._message_queue.put(
            AgentStreamMessage(
                type=StreamMessageType.STATE,
                execution_state=ToolExecutionState.COMPLETED,
                status_message=format_tool_completed_message(
                    tool_name, "Completed successfully."
                ),
                **fixed_params,
            )
        )
