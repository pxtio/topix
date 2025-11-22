"""Setup module."""

import logging

from pathlib import Path

from dotenv import load_dotenv

from topix.config.config import Config
from topix.config.services import service_config
from topix.datatypes.stage import StageEnum
from topix.store.qdrant.base import QdrantStore

logger = logging.getLogger(__name__)


async def setup(stage: StageEnum):
    """Set up the application configuration and environment variables."""
    # load .env file
    envpath = Path(__file__).parent.parent.parent / '.env'
    logger.info(f"Loading env from: {envpath}")
    load_dotenv(dotenv_path=envpath, override=True, verbose=True)

    config = Config.load(stage=stage)
    logger.info(f"Loaded configuration for stage: {stage}")

    service_config.update()

    await QdrantStore.from_config().create_collection()
    return config
