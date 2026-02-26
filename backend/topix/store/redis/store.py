"""Redis store manager for handling data in Redis."""
import time

from datetime import datetime, timedelta, timezone
from typing import Literal

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

    @staticmethod
    def _seconds_until_utc_reset(period: Literal["minute", "day", "month"]) -> int:
        """Return seconds until the next UTC boundary for the selected period."""
        now = datetime.now(timezone.utc)
        if period == "minute":
            next_boundary = now.replace(second=0, microsecond=0) + timedelta(minutes=1)
        elif period == "day":
            next_boundary = datetime(
                year=now.year,
                month=now.month,
                day=now.day,
                tzinfo=timezone.utc,
            ) + timedelta(days=1)
        else:
            year = now.year + (1 if now.month == 12 else 0)
            month = 1 if now.month == 12 else now.month + 1
            next_boundary = datetime(year=year, month=month, day=1, tzinfo=timezone.utc)

        return max(int((next_boundary - now).total_seconds()), 1)

    @staticmethod
    def _utc_period_bucket(period: Literal["minute", "day", "month"]) -> str:
        """Return UTC bucket key fragment for a fixed period."""
        now = datetime.now(timezone.utc)
        if period == "minute":
            return now.strftime("%Y%m%d%H%M")
        if period == "day":
            return now.strftime("%Y%m%d")
        return now.strftime("%Y%m")

    async def check_fixed_window_quota(
        self,
        user_id: str,
        limit: int,
        period: Literal["minute", "day", "month"],
        scope: str = "tier_usage",
    ) -> tuple[bool, int]:
        """Check and increment a UTC fixed-window quota."""
        bucket = self._utc_period_bucket(period)
        key = f"quota:{scope}:{period}:{bucket}:{user_id}"
        retry_after = self._seconds_until_utc_reset(period)

        current = await self.redis.incr(key)
        if current == 1:
            await self.redis.expire(key, retry_after)

        return current <= limit, retry_after

    async def check_cycle_window_quota(
        self,
        user_id: str,
        limit: int,
        cycle_start: datetime,
        cycle_end: datetime,
        scope: str = "tier_usage",
    ) -> tuple[bool, int]:
        """Check and increment a quota scoped to an explicit billing cycle."""
        start = cycle_start.astimezone(timezone.utc) if cycle_start.tzinfo else cycle_start.replace(tzinfo=timezone.utc)
        end = cycle_end.astimezone(timezone.utc) if cycle_end.tzinfo else cycle_end.replace(tzinfo=timezone.utc)

        now = datetime.now(timezone.utc)
        retry_after = max(int((end - now).total_seconds()), 1)
        start_key = start.strftime("%Y%m%dT%H%M%SZ")
        end_key = end.strftime("%Y%m%dT%H%M%SZ")
        key = f"quota:{scope}:cycle:{start_key}:{end_key}:{user_id}"

        current = await self.redis.incr(key)
        if current == 1:
            await self.redis.expire(key, retry_after)

        return current <= limit, retry_after
