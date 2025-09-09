"""Agent Config classes."""

from typing import Literal

import yaml

from pydantic import BaseModel

from agents import ModelSettings
from topix.agents.datatypes.web_search import WebSearchContextSize, WebSearchOption


class BaseAgentConfig(BaseModel):
    """Base Agent Config class."""

    model: str
    instructions_template: str
    model_settings: ModelSettings | None = None


class WebSearchConfig(BaseAgentConfig):
    """Web Search Agent Config class."""

    search_engine: WebSearchOption
    search_context_size: WebSearchContextSize


class PlanConfig(BaseAgentConfig):
    """Plan Config class."""

    web_search: WebSearchConfig
    memory_search: BaseAgentConfig
    code_interpreter: BaseAgentConfig


class AssistantManagerConfig(BaseModel):
    """Manager Config class."""

    plan: PlanConfig
    query_rewrite: BaseAgentConfig

    @staticmethod
    def from_yaml(filepath: str = "topix/agents/assistant/manager_config.yaml"):
        """Create an instance of ManagerConfig from a YAML file."""
        with open(filepath) as f:
            cf = yaml.safe_load(f)
        return AssistantManagerConfig.model_validate(cf)

    def set_web_engine(self, engine: WebSearchOption):
        """Switch the web search engine."""
        self.plan.web_search.search_engine = engine

        if engine in [WebSearchOption.OPENAI, WebSearchOption.PERPLEXITY]:
            self.plan.web_search.instructions_template = "web_search.jinja"
        else:
            self.plan.web_search.instructions_template = "decoupled_web_search.jinja"

    def set_plan_model(self, model: str):
        """Switch the plan model."""
        self.plan.model = model

    def set_reasoning(self, effort: Literal["low", "medium", "high"] | None):
        """Set the reasoning."""
        if not effort:
            self.plan.model_settings.reasoning = None
        else:
            self.plan.model_settings.reasoning = {
                "effort": effort,
                "summary": "auto"
            }
