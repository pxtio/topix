"""Agent Config classes."""

import logging

from pathlib import Path
from typing import Literal

import yaml

from agents import ModelSettings
from pydantic import BaseModel, field_validator

from topix.agents.datatypes.web_search import WebSearchContextSize, WebSearchOption
from topix.config.services import service_config
from topix.datatypes.recurrence import Recurrence

CONFIG_DIR = Path(__file__).parent / "configs"

logger = logging.getLogger(__name__)


class BaseAgentConfig(BaseModel):
    """Base Agent Config class."""

    model: str
    instructions_template: str
    model_settings: ModelSettings | None = None

    @field_validator("model")
    @classmethod
    def validate_model(cls, v: str) -> str:
        """Check if the model is valid."""
        if len(service_config.llm) == 0:
            raise ValueError("No LLM API available. Please add at least one LLM API.")

        valid_model_codes = [service.code for service in service_config.llm]

        if v in valid_model_codes:
            return v

        new_model = service_config.llm[0].code
        logger.info(f"Model '{v}' is not available, changing to '{new_model}'")
        return new_model


class WebSearchConfig(BaseAgentConfig):
    """Web Search Agent Config class."""

    search_context_size: WebSearchContextSize
    recency: Recurrence | None = None
    max_results: int = 10

    enable_summary: bool = False
    streamed: bool = False

    @property
    def search_engine(self) -> WebSearchOption:
        """Get the search engine."""
        if len(service_config.search) == 0:
            raise ValueError("No search API available. Please add at least one API in the config file.")
        self.search_engine = service_config.search[0].name


class PlanConfig(BaseAgentConfig):
    """Plan Config class."""

    web_search: WebSearchConfig
    memory_search: BaseAgentConfig
    code_interpreter: BaseAgentConfig | None = None
    navigate: BaseAgentConfig | None = None


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

        if 'plan' in cf:
            if len(service_config.navigate) == 0:
                cf['plan']['navigate'] = None

            if len(service_config.code) == 0:
                cf['plan']['code_interpreter'] = None

        return AssistantManagerConfig.model_validate(cf)

    def set_web_engine(self, engine: WebSearchOption, enable_summarization: bool = False):
        """Switch the web search engine."""
        self.plan.web_search.search_engine = engine

        if engine in [WebSearchOption.OPENAI]:
            self.plan.web_search.instructions_template = "web_search.jinja"
        else:
            self.plan.web_search.instructions_template = "decoupled_web_search.jinja"
            self.plan.web_search.enable_summary = enable_summarization

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

    outline_generator: WebCollectorConfig
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

    def set_model(self, model: str):
        """Switch the plan model."""
        self.outline_generator.model = model
        self.web_collector.model = model
        self.synthesis.model = model
