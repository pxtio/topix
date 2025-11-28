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

    # widget tools
    DISPLAY_STOCK_WIDGET = "display_stock_widget"
    DISPLAY_WEATHER_WIDGET = "display_weather_widget"
    DISPLAY_IMAGE_SEARCH_WIDGET = "display_image_search_widget"

    RAW_MESSAGE = "raw_message"

    IMAGE_DESCRIPTION = "image_description"
    TOPIC_ILLUSTRATOR = "topic_illustrator"

    IMAGE_GENERATION = "image_generation"


def to_display_output(tool_name: str) -> bool:
    """Check if the tool is for displaying output."""
    return tool_name in [
        AgentToolName.ANSWER_REFORMULATE,
        AgentToolName.RAW_MESSAGE,
        AgentToolName.SYNTHESIZER,
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
    AgentToolName.IMAGE_DESCRIPTION: "Describe an image",
    AgentToolName.TOPIC_ILLUSTRATOR: "Illustrate a topic",
    AgentToolName.DISPLAY_STOCK_WIDGET: "Display a stock widget",
    AgentToolName.DISPLAY_WEATHER_WIDGET: "Display a weather widget",
    AgentToolName.DISPLAY_IMAGE_SEARCH_WIDGET: "Display an image search widget",
    AgentToolName.IMAGE_GENERATION: "Generate images based on text prompts",
}
