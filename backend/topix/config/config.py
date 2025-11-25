"""Config classes."""

from __future__ import annotations

import logging
import os

from urllib.parse import quote_plus

from http_exceptions.client_exceptions import BadRequestException, UnauthorizedException
from pydantic import BaseModel, Field, SecretStr
from yaml import safe_load

from topix.config.utils import generate_jwt_secret, load_secrets
from topix.datatypes.stage import StageEnum
from topix.utils.singleton import SingletonMeta

logger = logging.getLogger(__name__)


class QdrantConfig(BaseModel):
    """Configuration for Qdrant vector database connection."""

    host: str = "localhost"
    port: int = 6333
    collection: str = "topix"
    https: bool = False
    api_key: SecretStr | None = None

    def model_post_init(self, __context):
        """Post-initialization to set up any derived attributes."""
        env_host = os.getenv("QDRANT_HOST")
        if env_host:
            self.host = env_host
            logger.info(f"Qdrant host set from environment QDRANT_HOST: {self.host}")

        env_port = os.getenv("QDRANT_PORT")
        if env_port:
            self.port = int(env_port)
            logger.info(f"Qdrant port set from environment QDRANT_PORT: {self.port}")


class PostgresConfig(BaseModel):
    """Configuration for PostgreSQL database connection."""

    hostname: str = "localhost"
    port: int = 5432
    database: str = "topix"
    user: str = "topix"
    password: SecretStr | None = None

    def model_post_init(self, __context):
        """Post-initialization to set up any derived attributes."""
        env_hostname = os.getenv("POSTGRES_HOST")
        if env_hostname:
            self.hostname = env_hostname
            logger.info(f"Postgres hostname set from environment POSTGRES_HOST: {self.hostname}")

        env_port = os.getenv("POSTGRES_PORT")
        if env_port:
            self.port = int(env_port)
            logger.info(f"Postgres port set from environment POSTGRES_PORT: {self.port}")

    def dsn(self) -> str:
        """Return a properly encoded PostgreSQL connection string."""
        user_enc = quote_plus(self.user)
        pwd_enc = quote_plus(self.password.get_secret_value()) if self.password else ""
        if pwd_enc:
            return f"postgresql://{user_enc}:{pwd_enc}@{self.hostname}:{self.port}/{self.database}"
        else:
            return f"postgresql://{user_enc}@{self.hostname}:{self.port}/{self.database}"


class DatabasesConfig(BaseModel):
    """Configuration for databases used in the application."""

    qdrant: QdrantConfig = Field(default_factory=QdrantConfig)
    postgres: PostgresConfig = Field(default_factory=PostgresConfig)


class BaseAPIConfig(BaseModel):
    """Base configuration for APIs used in the application."""

    url: str | None = None
    api_key: SecretStr | None = None
    env_var: str  # Environment variable name to load the API key from must be UPPERCASE

    def model_post_init(self, __context):
        """Post-initialization to set up any derived attributes."""
        env_key = os.getenv(self.env_var)
        if env_key:
            self.api_key = SecretStr(env_key)
            logger.info(f"API key set from environment {self.env_var}.")

        else:
            logger.warning(f"API key not found in environment {self.env_var}.")
            if self.api_key:
                logger.info(f"Using API key from config file for {self.env_var}.")
                os.environ[self.env_var] = self.api_key.get_secret_value()


class OpenAIConfig(BaseAPIConfig):
    """Configuration for OpenAI API."""

    env_var: str = "OPENAI_API_KEY"


class MistralConfig(BaseAPIConfig):
    """Configuration for Mistral API."""

    env_var: str = "MISTRAL_API_KEY"


class GeminiConfig(BaseAPIConfig):
    """Configuration for Gemini API."""

    env_var: str = "GEMINI_API_KEY"


class PerplexityConfig(BaseAPIConfig):
    """Configuration for Perplexity API."""

    env_var: str = "PERPLEXITY_API_KEY"


class TavilyConfig(BaseAPIConfig):
    """Configuration for Tavily API."""

    env_var: str = "TAVILY_API_KEY"


class LinkUpConfig(BaseAPIConfig):
    """Configuration for LinkUp API."""

    env_var: str = "LINKUP_API_KEY"


class AnthropicConfig(BaseAPIConfig):
    """Configuration for Anthropic API."""

    env_var: str = "ANTHROPIC_API_KEY"


class OpenRouterConfig(BaseAPIConfig):
    """Configuration for OpenRouter API."""

    env_var: str = "OPENROUTER_API_KEY"


class SerperConfig(BaseAPIConfig):
    """Configuration for Serper API."""

    env_var: str = "SERPER_API_KEY"


class UnsplashConfig(BaseModel):
    """Configuration for Unsplash API."""

    access_key: SecretStr | None = None

    def model_post_init(self, __context):
        """Post-initialization to set up any derived attributes."""
        env_key = os.getenv("UNSPLASH_ACCESS_KEY")
        if env_key:
            self.access_key = SecretStr(env_key)
            logger.info("Unsplash access key set from environment UNSPLASH_ACCESS_KEY.")

        else:
            logger.warning("Unsplash access key not found in environment UNSPLASH_ACCESS_KEY.")
            if self.access_key:
                logger.info("Using Unsplash access key from config file.")
                os.environ["UNSPLASH_ACCESS_KEY"] = self.access_key.get_secret_value()


class APIsConfig(BaseModel):
    """Configuration for external APIs used in the application."""

    openai: OpenAIConfig = Field(default_factory=OpenAIConfig)
    mistral: MistralConfig = Field(default_factory=MistralConfig)
    perplexity: PerplexityConfig = Field(default_factory=PerplexityConfig)
    tavily: TavilyConfig = Field(default_factory=TavilyConfig)
    linkup: LinkUpConfig = Field(default_factory=LinkUpConfig)
    gemini: GeminiConfig = Field(default_factory=GeminiConfig)
    anthropic: AnthropicConfig = Field(default_factory=AnthropicConfig)
    openrouter: OpenRouterConfig = Field(default_factory=OpenRouterConfig)
    serper: SerperConfig = Field(default_factory=SerperConfig)
    unsplash: UnsplashConfig = Field(default_factory=UnsplashConfig)


class RunConfig(BaseModel):
    """Configuration for running the application."""

    databases: DatabasesConfig = Field(default_factory=DatabasesConfig)
    apis: APIsConfig = Field(default_factory=APIsConfig)


class AppSettings(BaseModel):
    """Application settings."""

    port: int = 8888

    def model_post_init(self, __context):
        """Post-initialization to set up any derived attributes."""
        env_port = os.getenv("API_PORT")
        if env_port:
            self.port = int(env_port)
            logger.info(f"App port set from environment API_PORT: {self.port}")


def generate_or_load_jwt_secret_fr_env() -> SecretStr:
    """Generate or load JWT secret from environment variable."""
    env_secret = os.getenv("JWT_SECRET_KEY")
    if env_secret:
        logger.info("Loaded JWT secret from environment variable JWT_SECRET_KEY.")
        return SecretStr(env_secret)
    else:
        return SecretStr(generate_jwt_secret())


class SecuritySettings(BaseModel):
    """JWT Security settings."""

    secret_key: SecretStr = Field(default_factory=generate_or_load_jwt_secret_fr_env)
    algorithm: str = "HS256"


class AppConfig(BaseModel):
    """Application configuration settings."""

    name: str = "TopiX"
    settings: AppSettings = Field(default_factory=AppSettings)
    security: SecuritySettings = Field(default_factory=SecuritySettings)


class ConfigMeta(SingletonMeta, type(BaseModel)):
    """Meta class for Config to ensure singleton behavior."""

    pass


class Config(BaseModel, metaclass=ConfigMeta):
    """Configuration class for TopiX application."""

    stage: StageEnum = StageEnum.LOCAL
    run: RunConfig = Field(default_factory=RunConfig)
    app: AppConfig = Field(default_factory=AppConfig)

    @classmethod
    def load(
        cls,
        stage: StageEnum = StageEnum.LOCAL
    ) -> Config:
        """Load configuration from Doppler based on the provided stage."""
        try:
            secret = load_secrets(stage)
            config_data = safe_load(secret)
        except BadRequestException as e:
            if hasattr(e, 'status_code') and e.status_code == 400:
                logger.error(
                    f"Failed to load secrets from Doppler:\n---\n{e}\n---\nWill use default config. "
                    "Most config values can be precised in .env file.",
                )
                config_data = {}
            else:
                raise e
        except UnauthorizedException as e:
            if hasattr(e, 'status_code') and e.status_code == 401:
                logger.error(
                    f"Unauthorized to load secrets from Doppler:\n---\n{e}\n---\n"
                    "Will use default config. Most config values can be precised in .env file.",
                )
                config_data = {}
            else:
                raise e
        return cls(
            stage=stage,
            **config_data
        )
