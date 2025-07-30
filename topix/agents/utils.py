""" "Utility functions for agents."""

from contextlib import asynccontextmanager

from topix.agents.datatypes.context import Context
from topix.agents.datatypes.stream import (
    AgentStreamMessage,
    Content,
    ContentType
)
from topix.utils.common import gen_uid


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
    context: Context, tool_name: str, input_str: str | None = None
):
    """
    async context manager to handle tool execution
    """
    fixed_params = {
        "tool_id": gen_uid(),
        "tool_name": tool_name,
    }
    if input_str:
        start_message = f"Calling with: `{input_str}`."
    else:
        start_message = ""
    # __aenter__:
    await context._message_queue.put(
        AgentStreamMessage(
            content=Content(
                type=ContentType.STATUS,
                text=format_tool_start_message(
                    tool_name, start_message
                )
            ),
            is_stop=False,
            **fixed_params,
        )
    )

    try:
        yield fixed_params
    except Exception as e:
        await context._message_queue.put(
            AgentStreamMessage(
                content=Content(
                    type=ContentType.STATUS,
                    text=format_tool_completed_message(
                        tool_name, f"Failed with error: {e}"
                    ),
                ),
                is_stop="error",
                **fixed_params,
            )
        )
        raise e
    else:
        # __aexit__:
        await context._message_queue.put(
            AgentStreamMessage(
                content=Content(
                    type=ContentType.STATUS,
                    text=format_tool_completed_message(
                        tool_name, "Completed successfully."
                    ),
                ),
                is_stop=True,
                **fixed_params,
            )
        )
