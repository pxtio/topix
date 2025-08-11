"""Model Enum."""
from enum import Enum


class OpenAIModel(str, Enum):
    """OpenAI Models."""

    GPT_4O = "openai/gpt-4o"
    GPT_4O_MINI = "openai/gpt-4o-mini"
    GPT_4_1 = "openai/gpt-4.1"
    GPT_4_1_MINI = "openai/gpt-4.1-mini"
    GPT_4_1_NANO = "openai/gpt-4.1-nano"
    GPT_5 = "openai/gpt-5"
    GPT_5_MINI = "openai/gpt-5-mini"
    GPT_5_NANO = "openai/gpt-5-nano"


class GeminiModel(str, Enum):
    """Gemini Models."""

    GEMINI_2_FLASH = "gemini/gemini-2.0-flash"
    GEMINI_2_5_FLASH = "gemini/gemini-2.5-flash"
    GEMINI_2_5_PRO = "gemini/gemini-2.5-pro"


class PerplexityModel(str, Enum):
    """Perplexity Models."""

    PERPLEXITY_SONAR = "perplexity/sonar"


class ModelEnum:
    """Model Enum."""

    OpenAI = OpenAIModel
    Gemini = GeminiModel
    Perplexity = PerplexityModel


def support_temperature(model: str) -> bool:
    """Check if the model supports temperature.

    Temperature is possibly not supported in reasoning models due to
    introduced newer parameters like `verbosity` or `reasoning_effort`.
    """
    if model in [OpenAIModel.GPT_5, OpenAIModel.GPT_5_MINI, OpenAIModel.GPT_5_NANO]:
        return False
    return True
