"""Setup module."""

import logging
import os

from pathlib import Path

from dotenv import load_dotenv

from topix.config.config import Config
from topix.config.services import service_config
from topix.datatypes.stage import StageEnum
from topix.store.qdrant.base import QdrantStore
from topix.utils.common import running_in_docker

logger = logging.getLogger(__name__)

envpath = Path(__file__).parent.parent.parent / '.env'


def load_env_file(stage: StageEnum):
    """Load environment variables from a .env file."""
    logger.info(f"Loading env from: {envpath}")
    load_dotenv(dotenv_path=envpath, override=True, verbose=True)

    # override db config based on whether running in docker or not
    # and the stage
    if running_in_docker():
        logger.info("Detected running inside Docker.")
        if os.environ.get("POSTGRES_HOST") in ("", "localhost"):
            logger.info(
                "Detected POSTGRES_HOST is empty or localhost. "
                f"Overriding POSTGRES_HOST and POSTGRES_PORT for docker environment to `postgres-{str(stage)}` and `5432` respectively."
            )
            os.environ["POSTGRES_HOST"] = f"postgres-{str(stage)}"
            os.environ["POSTGRES_PORT"] = "5432"
        if os.environ.get("QDRANT_HOST") in ("", "localhost"):
            logger.info(
                "Detected QDRANT_HOST is empty or localhost. "
                f"Overriding QDRANT_HOST and QDRANT_PORT for docker environment to `qdrant-{str(stage)}` and `6333` respectively."
            )
            os.environ["QDRANT_HOST"] = f"qdrant-{str(stage)}"
            os.environ["QDRANT_PORT"] = "6333"
        if os.environ.get("REDIS_HOST") in ("", "localhost"):
            logger.info(
                "Detected REDIS_HOST is empty or localhost. "
                f"Overriding REDIS_HOST and REDIS_PORT for docker environment to `redis-{str(stage)}` and `6379` respectively."
            )
            os.environ["REDIS_HOST"] = f"redis-{str(stage)}"
            os.environ["REDIS_PORT"] = "6379"


async def setup(stage: StageEnum) -> Config:
    """Set up the application configuration and environment variables."""
    # load .env file
    load_env_file(stage)

    config = Config.load(stage=stage)
    logger.info(f"Loaded configuration for stage: {stage}")

    service_config.update()

    await QdrantStore.from_config().create_collection()
    return config
