"""Setup module."""

import os

from topix.config.config import Config
from topix.datatypes.stage import StageEnum
from topix.store.qdrant.base import QdrantStore


async def setup(stage: StageEnum):
    """Setup the application configuration and environment variables."""

    config = Config.load(stage=stage)

    os.environ['OPENAI_API_KEY'] = config.run.apis.openai.api_key

    await QdrantStore.from_config().create_collection()
    return config
