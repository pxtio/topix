import os

from topix.config.config import Config
from topix.store.qdrant.base import QdrantStore


async def setup(**kwargs):
    config = Config.load(**kwargs)

    os.environ['OPENAI_API_KEY'] = config.run.apis.openai.api_key

    await QdrantStore.from_config().create_collection()
    return config
