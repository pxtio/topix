"""Async Postgres connection pool for src."""

from psycopg_pool import AsyncConnectionPool

from src.config.config import Config


def create_pool() -> AsyncConnectionPool:
    """Create a new Postgres connection pool."""
    config = Config.instance()
    postgres_url = config.run.databases.postgres.dsn()
    return AsyncConnectionPool(
        postgres_url,
        min_size=1,
        max_size=100,
        open=False
    )
