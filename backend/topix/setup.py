"""Setup module."""

import os

from topix.config.config import Config
from topix.datatypes.stage import StageEnum
from topix.store.qdrant.base import QdrantStore


async def setup(stage: StageEnum):
    """Set up the application configuration and environment variables."""
    config = Config.load(stage=stage)

    os.environ['OPENAI_API_KEY'] = config.run.apis.openai.api_key
    os.environ["TAVILY_API_KEY"] = config.run.apis.tavily.api_key
    os.environ["LINKUP_API_KEY"] = config.run.apis.linkup.api_key
    os.environ["PERPLEXITY_API_KEY"] = config.run.apis.perplexity.api_key
    os.environ["SERPER_API_KEY"] = config.run.apis.serper.api_key
    os.environ["GEMINI_API_KEY"] = config.run.apis.gemini.api_key
    os.environ["ANTHROPIC_API_KEY"] = config.run.apis.anthropic.api_key
    os.environ["OPENROUTER_API_KEY"] = config.run.apis.openrouter.api_key

    await QdrantStore.from_config().create_collection()
    return config
