""""Utility functions for agents."""


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
