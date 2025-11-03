"""Agent tool names."""

from enum import StrEnum


class AgentToolName(StrEnum):
    """Enumeration for tool names used in the agent manager."""

    ANSWER_REFORMULATE = "answer_reformulate"

    MEMORY_SEARCH = "memory_search"
    WEB_SEARCH = "web_search"
    CODE_INTERPRETER = "code_interpreter"

    NAVIGATE = "navigate"

    OUTLINE_GENERATOR = "outline_generator"
    WEB_COLLECTOR = "web_collector"
    SYNTHESIZER = "synthesizer"

    STOCK_COLLECTOR = "stock_collector"
    STOCK_SYNTHESIZER = "stock_synthesizer"

    RAW_MESSAGE = "raw_message"


def to_display_output(tool_name: str) -> bool:
    """Check if the tool is for displaying output."""
    return tool_name in [
        AgentToolName.ANSWER_REFORMULATE,
        AgentToolName.RAW_MESSAGE,
        AgentToolName.SYNTHESIZER,
        AgentToolName.STOCK_SYNTHESIZER,
    ]


tool_descriptions = {
    AgentToolName.ANSWER_REFORMULATE: "Reformulate the answer",
    AgentToolName.MEMORY_SEARCH: "Search the memory",
    AgentToolName.WEB_SEARCH: "Search the web",
    AgentToolName.CODE_INTERPRETER: "Run code",
    AgentToolName.RAW_MESSAGE: "Reasoning message",
    AgentToolName.NAVIGATE: "Navigate the web",
    AgentToolName.OUTLINE_GENERATOR: "Generate an outline for research",
    AgentToolName.WEB_COLLECTOR: "Collect web content based on the outline",
    AgentToolName.SYNTHESIZER: "Synthesize a report based on collected content",
    AgentToolName.STOCK_COLLECTOR: "Collect stock information from the web",
    AgentToolName.STOCK_SYNTHESIZER: "Synthesize a stock review based on collected information",
}
