"""Agent tool names."""

from enum import StrEnum


class AgentToolName(StrEnum):
    """Enumeration for tool names used in the agent manager."""

    MEMORY_SEARCH = "memory_search"
    WEB_SEARCH = "web_search"
    CODE_INTERPRETER = "code_interpreter"

    OUTLINE_GENERATOR = "outline_generator"
    WEB_COLLECTOR = "web_collector"
    SYNTHESIZER = "synthesizer"

    RAW_MESSAGE = "raw_message"


def to_display_output(tool_name: str) -> bool:
    """Check if the tool is for displaying output."""
    return tool_name in [
        AgentToolName.ANSWER_REFORMULATE,
        AgentToolName.RAW_MESSAGE,
    ]


tool_descriptions = {
    AgentToolName.MEMORY_SEARCH: "Search the memory",
    AgentToolName.WEB_SEARCH: "Search the web",
    AgentToolName.CODE_INTERPRETER: "Run code",
    AgentToolName.RAW_MESSAGE: "Reasoning message",
}
