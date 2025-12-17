"""Redis store manager for handling data in Redis."""
import time

from redis.asyncio import Redis

from topix.config.config import Config, RedisConfig


class RedisStore:
    """Manager for handling data in the Redis store."""

    def __init__(
        self,
        redis_client: Redis
    ):
        """Init method."""
        self.redis = redis_client

    @classmethod
    def from_config(cls):
        """Create an instance of RedisStore from configuration."""
        config: Config = Config.instance()
        redis_config: RedisConfig = config.run.databases.redis

        redis_client = Redis(
            host=redis_config.host,
            port=redis_config.port,
            db=redis_config.db,
            password=redis_config.password.get_secret_value() if redis_config.password else None,
            decode_responses=True
        )

        return cls(redis_client=redis_client)

    async def close(self) -> None:
        """Close the Redis connection."""
        await self.redis.aclose()

    async def check_rate_limit(
        self,
        user_id: str,
        max_requests: int,
        window_seconds: int,
        scope: str | None = None,
    ) -> bool:
        """Check if a user is within the rate limit using a sliding window algorithm.

        Args:
            user_id: The user ID to check the rate limit for.
            max_requests: Maximum number of requests allowed in the time window.
            window_seconds: Time window in seconds.
            scope: Optional scope to differentiate rate limits (e.g., per endpoint).

        Returns:
            True if the user is within the rate limit, False otherwise.

        """
        current_time = time.time()
        window_start = current_time - window_seconds

        # Redis key for this user's rate limit
        if scope:
            key = f"rate_limit:{scope}:{user_id}"
        else:
            key = f"rate_limit:{user_id}"

        # Use Redis pipeline for atomic operations
        pipe = self.redis.pipeline()

        # Remove requests older than the window
        pipe.zremrangebyscore(key, 0, window_start)

        # Count requests in the current window
        pipe.zcard(key)

        # Add current request timestamp
        pipe.zadd(key, {str(current_time): current_time})

        # Set expiration to clean up old keys
        pipe.expire(key, window_seconds)

        # Execute pipeline
        results = await pipe.execute()

        # Get the count before adding the current request
        request_count = results[1]

        return request_count < max_requests
