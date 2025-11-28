"""All services info."""

import logging
import os

from enum import StrEnum
from pathlib import Path
from typing import Literal

import yaml

from pydantic import BaseModel

logger = logging.getLogger(__name__)

LLM_FILEPATH = Path(__file__).parent.parent / "llm_models.yml"
SERVICES_FILEPATH = Path(__file__).parent.parent / "services.yml"


class ServiceEnum(StrEnum):
    """Service types."""

    LLM = "llm"
    SEARCH = "search"
    NAVIGATE = "navigate"
    CODE = "code"
    IMAGE_GENERATION = "image_generation"


class LLMTier(StrEnum):
    """LLM Model tiers."""

    PRO = "pro"
    LITE = "lite"


class BaseService(BaseModel):
    """Base Service info."""

    type: ServiceEnum
    name: str
    provider: str


class LLMService(BaseService):
    """LLM Service info."""

    type: Literal[ServiceEnum.LLM] = ServiceEnum.LLM
    model: str
    tier: LLMTier
    openrouter_model: str | None = None
    use_openrouter: bool = False

    @property
    def code(self) -> str:
        """Get the code representation of the LLM service."""
        if not self.use_openrouter:
            return f"{self.provider}/{self.model}"
        else:
            model_name = self.openrouter_model or f"{self.provider}/{self.model}"
            return f"openrouter/{model_name}"


class SearchService(BaseService):
    """Search Service info."""

    type: Literal[ServiceEnum.SEARCH] = ServiceEnum.SEARCH


class NavigateService(BaseService):
    """Navigate Service info."""

    type: Literal[ServiceEnum.NAVIGATE] = ServiceEnum.NAVIGATE


class CodeService(BaseService):
    """Code Service info."""

    type: Literal[ServiceEnum.CODE] = ServiceEnum.CODE


class ImageGenerationService(BaseService):
    """Image Generation Service info."""

    type: Literal[ServiceEnum.IMAGE_GENERATION] = ServiceEnum.IMAGE_GENERATION


class ServiceConfig(BaseModel):
    """Valid Services info."""

    providers: list[str]
    llm: list[LLMService]
    search: list[SearchService]
    navigate: list[NavigateService]
    code: list[CodeService]
    image_generation: list[ImageGenerationService]

    @classmethod
    def _sync(cls) -> dict:
        """Sync the services config with environment variables."""
        with open(SERVICES_FILEPATH) as f:
            cf = yaml.safe_load(f)

        # Get valid providers:
        providers: list[str] = []
        for provider, env_var in cf["providers"].items():
            # Check if the env var is set and is not empty
            if os.getenv(env_var["env_var"]):
                providers.append(provider)

        # Get valid services
        services = cf["services"]

        dct = {}
        dct["providers"] = providers
        dct["llm"] = cls._get_llm_services(services[ServiceEnum.LLM], providers)
        dct["search"] = [
            SearchService.model_validate(service)
            for service in services[ServiceEnum.SEARCH] if service["provider"] in providers
        ]
        dct["navigate"] = [
            NavigateService.model_validate(service)
            for service in services[ServiceEnum.NAVIGATE] if service["provider"] in providers
        ]
        dct["code"] = [
            CodeService.model_validate(service)
            for service in services[ServiceEnum.CODE] if service["provider"] in providers
        ]
        return dct

    def update(self):
        """Update the service config."""
        synced_data = self._sync()

        logger.info("Updating service configuration from environment variables.")
        for key, value in synced_data.items():
            setattr(self, key, value)

    @classmethod
    def from_yaml(cls) -> "ServiceConfig":
        """Create an instance of ServiceManager from a YAML file."""
        synced_data = cls._sync()

        return cls(**synced_data)

    @classmethod
    def _get_llm_services(
        cls,
        llm_services: list[str],
        providers: list[str],
    ) -> list[LLMService]:
        """Get a list of valid LLM services from a given list of LLM names and providers.

        Args:
            llm_services (list[str]): A list of LLM names.
            providers (list[str]): A list of valid providers.

        Returns:
            list[LLMService]: A list of valid LLM services.

        """
        with open(LLM_FILEPATH) as f:
            cf: list[dict] = yaml.safe_load(f)

        res = []
        for llm_name in llm_services:
            if llm_name in cf:
                if cf[llm_name]["provider"] in providers:
                    res.append(LLMService.model_validate({'name': llm_name, **cf[llm_name]}))
                elif "openrouter" in providers:
                    res.append(
                        LLMService.model_validate(dict(
                            name=llm_name,
                            **cf[llm_name],
                            use_openrouter=True,
                        ))
                    )
        return res


"""
The global service config, to utilise:
from topix.config.services import service_config
"""
service_config = ServiceConfig.from_yaml()
