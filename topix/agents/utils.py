"""Utility functions for agents."""

import functools
import inspect

from contextlib import asynccontextmanager
from typing import Any, Callable

from pydantic import BaseModel

from topix.agents.datatypes.context import Context, ToolCall
from topix.agents.datatypes.stream import AgentStreamMessage, Content, ContentType
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


def format_params(
    params: dict[str:Any], max_val_len: int = 60, max_params: int = 5
) -> str:
    """Format input params as a bullet list for starting message."""
    parts = []
    for idx, (key, val) in enumerate(params.items()):
        if idx >= max_params:
            parts.append("  - ...")
            break
        val_repr = repr(val)
        if len(val_repr) > max_val_len:
            val_repr = val_repr[: max_val_len - 3] + "..."
        parts.append(f"  - `{key}`: {val_repr}")
    return "\n".join(parts)


@asynccontextmanager
async def tool_execution_handler(
    context: Context, tool_name: str, start_msg: str | None = None
):
    """Async context manager to handle tool execution."""
    fixed_params = {
        "tool_id": gen_uid(),
        "tool_name": tool_name,
    }
    if start_msg:
        start_message = f"Calling with: `{start_msg}`."
    else:
        start_message = ""
    # __aenter__:
    await context._message_queue.put(
        AgentStreamMessage(
            content=Content(
                type=ContentType.STATUS,
                text=format_tool_start_message(tool_name, start_message),
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


def tool_execution_decorator(tool_name: str):
    """Handle tool execution in a decorator."""

    def decorator(func: Callable[..., Any]) -> Callable[..., Any]:
        @functools.wraps(func)
        async def wrapper(context: Context, *args: Any, **kwargs: Any) -> Any:
            log_params = {}
            try:
                bound_args = inspect.signature(func).bind(context, *args, **kwargs)
                bound_args.apply_defaults()
                for name, value in bound_args.arguments.items():
                    if name == "context":
                        continue
                    if isinstance(value, BaseModel):
                        log_params[name] = value.model_dump()
                    else:
                        log_params[name] = value
            except Exception:
                pass

            if log_params:
                formatted_params = format_params(log_params)
                start_message = f"Calling with: {formatted_params}"
            else:
                start_message = ""

            async with tool_execution_handler(
                context, tool_name, start_msg=start_message
            ) as fixed_params:
                result = await func(context, *args, **kwargs)

            tool_call = ToolCall(
                tool_id=fixed_params["tool_id"],
                tool_name=fixed_params["tool_name"],
                arguments=log_params,
                output=result,
            )
            context.tool_calls.append(tool_call)

        return wrapper

    return decorator
