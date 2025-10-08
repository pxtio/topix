"""Agent Config classes."""

from pathlib import Path
from typing import Literal

import yaml

from agents import ModelSettings
from pydantic import BaseModel

from topix.agents.datatypes.web_search import WebSearchContextSize, WebSearchOption
from topix.datatypes.recurrence import Recurrence

CONFIG_DIR = Path(__file__).parent / "configs"


class BaseAgentConfig(BaseModel):
    """Base Agent Config class."""

    model: str
    instructions_template: str
    model_settings: ModelSettings | None = None


class WebSearchConfig(BaseAgentConfig):
    """Web Search Agent Config class."""

    search_engine: WebSearchOption
    search_context_size: WebSearchContextSize
    recency: Recurrence | None = None
    max_results: int = 10

    enable_summary: bool = False
    streamed: bool = False


class PlanConfig(BaseAgentConfig):
    """Plan Config class."""

    web_search: WebSearchConfig
    memory_search: BaseAgentConfig
    code_interpreter: BaseAgentConfig
    navigate: BaseAgentConfig

    # For Tavily and LinkUp
    enable_web_summarization: bool = True


class AssistantManagerConfig(BaseModel):
    """Manager Config class."""

    plan: PlanConfig
    synthesis: BaseAgentConfig
    query_rewrite: BaseAgentConfig

    @staticmethod
    def from_yaml(filepath: str | None = None):
        """Create an instance of ManagerConfig from a YAML file."""
        if not filepath:
            filepath = CONFIG_DIR / "assistant.yml"
        with open(filepath) as f:
            cf = yaml.safe_load(f)
        return AssistantManagerConfig.model_validate(cf)

    def set_web_engine(
        self, engine: WebSearchOption, enable_summarization: bool = False
    ):
        """Switch the web search engine."""
        self.plan.web_search.search_engine = engine

        if engine in [WebSearchOption.OPENAI]:
            self.plan.web_search.instructions_template = "web_search.jinja"
            self.plan.enable_web_summarization = True
        else:
            if enable_summarization:
                # The raw web results will be summarized by LLM model
                self.plan.web_search.instructions_template = "decoupled_web_search.jinja"
                self.plan.enable_web_summarization = True
            else:
                self.plan.enable_web_summarization = False

    def set_model(self, model: str):
        """Switch the plan model."""
        self.plan.model = model
        self.synthesis.model = model

    def set_reasoning(self, effort: Literal["low", "medium", "high"] | None):
        """Set the reasoning."""
        if not effort:
            self.plan.model_settings.reasoning = None
        else:
            self.plan.model_settings.reasoning = {"effort": effort, "summary": "auto"}


class DeepResearchConfig(BaseModel):
    """Configuration for the learning module retrieval process."""

    class WebCollectorConfig(BaseAgentConfig):
        """Web Collector Config class."""

        web_search: WebSearchConfig

    outline_generator: BaseAgentConfig
    web_collector: WebCollectorConfig
    synthesis: BaseAgentConfig

    @staticmethod
    def from_yaml(filepath: str | None = None):
        """Create an instance of LearningModuleConfig from a YAML file."""
        if not filepath:
            filepath = CONFIG_DIR / "deep_research.yml"
        with open(filepath) as f:
            cf = yaml.safe_load(f)
        return DeepResearchConfig.model_validate(cf)
