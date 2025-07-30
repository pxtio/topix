"""Model Enum."""
from enum import Enum


class OpenAIModel(str, Enum):
    """OpenAI Models."""

    GPT_4O = "openai/gpt-4o"
    GPT_4O_MINI = "openai/gpt-4o-mini"
    GPT_4_1 = "openai/gpt-4.1"
    GPT_4_1_MINI = "openai/gpt-4.1-mini"
    GPT_4_1_NANO = "openai/gpt-4.1-nano"


class GeminiModel(str, Enum):
    """Gemini Models."""

    GEMINI_2_FLASH = "gemini-2.0-flash"
    GEMINI_2_5_FLASH = "gemini-2.5-flash"
    GEMINI_2_5_PRO = "gemini-2.5-pro"


class ModelEnum:
    """Model Enum."""

    OpenAI = OpenAIModel
    Gemini = GeminiModel
