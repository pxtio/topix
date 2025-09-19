"""Web Search Settings Data Types."""
from enum import StrEnum


class WebSearchOption(StrEnum):
    """Enumeration of web search options."""

    OPENAI = "openai"
    TAVILY = "tavily"
    PERPLEXITY = "perplexity"
    LINKUP = "linkup"


class WebSearchContextSize(StrEnum):
    """Enumeration of web search context sizes."""

    SMALL = "small"
    MEDIUM = "medium"
    HIGH = "high"
