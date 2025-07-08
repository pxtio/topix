from __future__ import annotations

import os

from pydantic import BaseModel
from yaml import safe_load

from topix.datatypes.stage import StageEnum
from topix.utils.singleton import SingletonMeta


class QdrantConfig(BaseModel):
    host: str = "localhost"
    port: int = 6333
    collection: str = "topix"
    https: bool = False
    api_key: str | None = None


class PostgresConfig(BaseModel):
    hostname: str = "localhost"
    port: int = 5432
    database: str = "topix"
    user: str = "topix"


class DatabasesConfig(BaseModel):
    qdrant: QdrantConfig = QdrantConfig()
    postgres: PostgresConfig = PostgresConfig()


class OpenAIConfig(BaseModel):
    api_key: str


class MistralConfig(BaseModel):
    url: str
    api_key: str


class APIsConfig(BaseModel):
    openai: OpenAIConfig
    mistral: MistralConfig


class RunConfig(BaseModel):
    databases: DatabasesConfig = DatabasesConfig()
    apis: APIsConfig


class AppSettings(BaseModel):
    port: int = 8888


class AppConfig(BaseModel):
    name: str = "TopiX"
    settings: AppSettings = AppSettings()


class ConfigMeta(SingletonMeta, type(BaseModel)):
    pass


class Config(BaseModel, metaclass=ConfigMeta):
    stage: StageEnum = StageEnum.LOCAL
    run: RunConfig
    app: AppConfig

    @classmethod
    def load(
        cls,
        stage: StageEnum = StageEnum.LOCAL,
        config_file_path: str | None = None
    ) -> Config:
        if config_file_path is None:
            config_file_path = os.path.join("config", f"{stage}.yml")
        if not os.path.exists(config_file_path):
            raise FileNotFoundError(f"Configuration file not found: {config_file_path}")
        with open(config_file_path, "r") as f:
            config_data = safe_load(f)
        return cls(
            stage=stage,
            **config_data
        )
