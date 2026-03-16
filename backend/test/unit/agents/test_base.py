"""Unit tests for base agent model setting adjustments."""

from agents import ModelSettings
from agents.extensions.models.litellm_model import LitellmModel

from topix.agents.base import BaseAgent


def test_adjust_model_settings_uses_agent_name_for_openai_prompt_cache_key():
    """OpenAI string models should bucket prompt caching by agent name."""
    agent = BaseAgent.__new__(BaseAgent)
    agent.name = "planner_agent"

    settings = agent._adjust_model_settings(
        "openai/gpt-5-mini",
        ModelSettings(extra_args={"existing": "value"}),
    )

    assert settings.extra_args == {
        "existing": "value",
        "prompt_cache_key": "planner_agent",
    }


def test_adjust_model_settings_keeps_litellm_specific_extra_args():
    """LiteLLM models should keep the provider-specific dropped-params config."""
    agent = BaseAgent.__new__(BaseAgent)

    settings = agent._adjust_model_settings(
        LitellmModel("anthropic/claude-3-5-sonnet"),
        ModelSettings(),
    )

    assert settings.extra_args == {
        "drop_params": True,
        "additional_drop_params": ["frequency_penalty", "presence_penalty"],
    }
