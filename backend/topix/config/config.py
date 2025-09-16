"""Config classes."""

from __future__ import annotations

from urllib.parse import quote_plus

from pydantic import BaseModel
from yaml import safe_load

from topix.config.utils import load_secrets
from topix.datatypes.stage import StageEnum
from topix.utils.singleton import SingletonMeta


class QdrantConfig(BaseModel):
    """Configuration for Qdrant vector database connection."""

    host: str = "localhost"
    port: int = 6333
    collection: str = "topix"
    https: bool = False
    api_key: str | None = None


class PostgresConfig(BaseModel):
    """Configuration for PostgreSQL database connection."""

    hostname: str = "localhost"
    port: int = 5432
    database: str = "topix"
    user: str = "topix"
    password: str | None = None

    def dsn(self) -> str:
        """Return a properly encoded PostgreSQL connection string."""
        user_enc = quote_plus(self.user)
        pwd_enc = quote_plus(self.password) if self.password else ""
        if pwd_enc:
            return f"postgresql://{user_enc}:{pwd_enc}@{self.hostname}:{self.port}/{self.database}"
        else:
            return f"postgresql://{user_enc}@{self.hostname}:{self.port}/{self.database}"


class DatabasesConfig(BaseModel):
    """Configuration for databases used in the application."""

    qdrant: QdrantConfig = QdrantConfig()
    postgres: PostgresConfig = PostgresConfig()


class BaseAPIConfig(BaseModel):
    """Base configuration for APIs used in the application."""

    url: str | None = None
    api_key: str


class OpenAIConfig(BaseAPIConfig):
    """Configuration for OpenAI API."""

    pass


class MistralConfig(BaseAPIConfig):
    """Configuration for Mistral API."""

    pass


class GeminiConfig(BaseAPIConfig):
    """Configuration for Gemini API."""

    pass


class PerplexityConfig(BaseAPIConfig):
    """Configuration for Perplexity API."""

    pass


class TavilyConfig(BaseAPIConfig):
    """Configuration for Tavily API."""

    pass


class LinkUpConfig(BaseAPIConfig):
    """Configuration for LinkUp API."""

    pass


class AnthropicConfig(BaseAPIConfig):
    """Configuration for Anthropic API."""

    pass


class APIsConfig(BaseModel):
    """Configuration for external APIs used in the application."""

    openai: OpenAIConfig
    mistral: MistralConfig
    perplexity: PerplexityConfig
    tavily: TavilyConfig
    linkup: LinkUpConfig
    gemini: GeminiConfig
    anthropic: AnthropicConfig


class RunConfig(BaseModel):
    """Configuration for running the application."""

    databases: DatabasesConfig = DatabasesConfig()
    apis: APIsConfig


class AppSettings(BaseModel):
    """Application settings."""

    port: int = 8888


class SecuritySettings(BaseModel):
    """JWT Security settings."""
    secret_key: str
    algorithm: str


class AppConfig(BaseModel):
    """Application configuration settings."""

    name: str = "TopiX"
    settings: AppSettings = AppSettings()
    security: SecuritySettings


class ConfigMeta(SingletonMeta, type(BaseModel)):
    """Meta class for Config to ensure singleton behavior."""

    pass


class Config(BaseModel, metaclass=ConfigMeta):
    """Configuration class for TopiX application."""

    stage: StageEnum = StageEnum.LOCAL
    run: RunConfig
    app: AppConfig

    @classmethod
    def load(
        cls,
        stage: StageEnum = StageEnum.LOCAL
    ) -> Config:
        """Load configuration from Doppler based on the provided stage."""
        secret = load_secrets(stage)
        config_data = safe_load(secret)
        return cls(
            stage=stage,
            **config_data
        )
