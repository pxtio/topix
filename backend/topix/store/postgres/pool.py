"""Async Postgres connection pool for topix."""

import asyncpg

from topix.config.config import Config


async def create_pool() -> asyncpg.Pool:
    """Create a new Postgres connection pool."""
    config = Config.instance()
    postgres_url = config.run.databases.postgres.dsn()
    return await asyncpg.create_pool(
        postgres_url,
        min_size=1,
        max_size=100,
    )
