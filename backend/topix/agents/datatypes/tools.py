"""Agent tool names."""

from topix.datatypes.enum import CustomEnum


class AgentToolName(str, CustomEnum):
    """Enumeration for tool names used in the agent manager."""

    ANSWER_REFORMULATE = "answer_reformulate"
    KNOWLEDGE_BASE_SEARCH = "knowledge_base_search"
    WEB_SEARCH = "web_search"
    CODE_INTERPRETER = "code_interpreter"

    RAW_MESSAGE = "raw_message"


def to_display_output(tool_name: str) -> bool:
    """Check if the tool is for displaying output."""
    return tool_name in [
        AgentToolName.ANSWER_REFORMULATE,
        AgentToolName.RAW_MESSAGE,
    ]
