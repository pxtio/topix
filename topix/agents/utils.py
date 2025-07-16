""""Utility functions for agents."""


def format_tool_start_message(tool_name: str, query: str) -> str:
    """Format the start message for a tool execution."""
    return (
        f"\n\n🚀 [Tool Start] `{tool_name}`\n"
        f"  ↪ Query: `{query}`\n\n"
    )


def format_tool_finished_message(tool_name: str, result: str | None = None) -> str:
    """Format the finished message for a tool execution."""
    if result is None:
        return f"\n\n✅ [Tool Finished] `{tool_name}`\n\n"
    return (
        f"\n\n✅ [Tool Finished] `{tool_name}`\n\n"
        f"  ↪ Result: `{result}`\n\n"
    )
