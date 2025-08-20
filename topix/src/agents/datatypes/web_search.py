"""Web Search Settings Data Types."""
from src.datatypes.enum import CustomEnum


class WebSearchOption(str, CustomEnum):
    """Enumeration of web search options."""

    OPENAI = "openai"
    TAVILY = "tavily"
    PERPLEXITY = "perplexity"
    LINKUP = "linkup"


class WebSearchContextSize(str, CustomEnum):
    """Enumeration of web search context sizes."""

    SMALL = "small"
    MEDIUM = "medium"
    LARGE = "large"
