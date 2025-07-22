import pytest
import pytest_asyncio

from psycopg import AsyncConnection

from topix.config.config import Config
from topix.datatypes.stage import StageEnum


@pytest.fixture(scope="session")
def config() -> Config:
    """Fixture to provide the application configuration."""
    return Config.load(stage=StageEnum.TEST)


@pytest_asyncio.fixture
async def conn(config: Config):
    # Set up your database URL
    connection = await AsyncConnection.connect(config.run.databases.postgres.dsn())
    try:
        yield connection
    finally:
        await connection.close()
