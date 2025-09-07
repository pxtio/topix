"""Agent tool names."""

from enum import StrEnum


class AgentToolName(StrEnum):
    """Enumeration for tool names used in the agent manager."""

    MEMORY_SEARCH = "memory_search"
    WEB_SEARCH = "web_search"
    CODE_INTERPRETER = "code_interpreter"

    RAW_MESSAGE = "raw_message"


def to_display_output(tool_name: str) -> bool:
    """Check if the tool is for displaying output."""
    return tool_name in [
        AgentToolName.RAW_MESSAGE,
    ]
