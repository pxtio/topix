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
    GPT_5_1_CHAT = "openai/gpt-5.1-chat-latest"
    GPT_5_1 = "openai/gpt-5.1"


class GeminiModel(str, Enum):
    """Gemini Models."""

    GEMINI_2_FLASH = "gemini/gemini-2.0-flash"
    GEMINI_2_5_FLASH = "gemini/gemini-2.5-flash"
    GEMINI_2_5_PRO = "gemini/gemini-2.5-pro"


class OpenRouterModel(str, Enum):
    """Anthropic Models."""

    CLAUDE_SONNET_4 = "openrouter/anthropic/claude-sonnet-4.5"
    CLAUDE_OPUS_4_1 = "openrouter/anthropic/claude-opus-4.1"
    CLAUDE_HAIKU = "openrouter/anthropic/claude-3.5-haiku"
    DEEPSEEK_CHAT = "openrouter/deepseek/deepseek-chat-v3.1"
    MISTRAL_MEDIUM = "openrouter/mistralai/mistral-medium-3.1"
    GEMINI_2_5_FLASH = "openrouter/google/gemini-2.5-flash"


class PerplexityModel(str, Enum):
    """Perplexity Models."""

    PERPLEXITY_SONAR = "perplexity/sonar"


class ModelEnum:
    """Model Enum."""

    OpenAI = OpenAIModel
    Gemini = GeminiModel
    Perplexity = PerplexityModel
    OpenRouter = OpenRouterModel


def support_temperature(model: str) -> bool:
    """Check if the model supports temperature.

    Temperature is possibly not supported in reasoning models due to
    introduced newer parameters like `verbosity` or `reasoning_effort`.
    """
    if model in [OpenAIModel.GPT_5, OpenAIModel.GPT_5_MINI, OpenAIModel.GPT_5_NANO, OpenAIModel.GPT_5_1_CHAT]:
        return False
    return True


def support_reasoning(model: str) -> bool:
    """Check if the model supports reasoning."""
    reasoning_models = {
        # OpenAI reasoning-capable
        OpenAIModel.GPT_5_1,
        OpenAIModel.GPT_5_1_CHAT,
        OpenAIModel.GPT_5,
        OpenAIModel.GPT_5_MINI,
        OpenAIModel.GPT_5_NANO,

        # Gemini reasoning-capable
        GeminiModel.GEMINI_2_5_FLASH,
        GeminiModel.GEMINI_2_5_PRO,

        # Perplexity reasoning-capable
        PerplexityModel.PERPLEXITY_SONAR
    }

    return model in reasoning_models


def support_reasoning_effort_instant_mode(model: str) -> bool:
    """Check if the model supports instant reasoning effort."""
    return model in [OpenAIModel.GPT_5_1_CHAT]


def support_reasoning_effort_none(model: str) -> bool:
    """Check if the model supports 'none' reasoning effort."""
    return model in [OpenAIModel.GPT_5_1]


def support_penalties(model: str) -> bool:
    """Check if the model supports frequency and presence penalty."""
    if model in [
        OpenAIModel.GPT_4O,
        OpenAIModel.GPT_4O_MINI,
        OpenAIModel.GPT_4_1,
        OpenAIModel.GPT_4_1_MINI,
        OpenAIModel.GPT_4_1_NANO,
        OpenAIModel.GPT_5_1_CHAT,
        OpenAIModel.GPT_5,
        OpenAIModel.GPT_5_MINI,
        OpenAIModel.GPT_5_NANO,
        GeminiModel.GEMINI_2_5_FLASH,
        GeminiModel.GEMINI_2_5_PRO,
    ]:
        return False
    return True
