"""Rate limiter utility using Redis sliding window algorithm."""


from typing import Annotated

from fastapi import Depends, HTTPException, Request, status

from topix.api.utils.security import get_current_user_uid
from topix.store.redis.store import RedisStore

# Rate limiting configuration
RATE_LIMIT_REQUESTS = 10  # Number of requests allowed
RATE_LIMIT_WINDOW = 60  # Time window in seconds (1 minute)


async def rate_limiter(
    request: Request,
    user_id: Annotated[str, Depends(get_current_user_uid)],
) -> None:
    """Rate limit requests based on user_id using Redis sliding window.

    Allows RATE_LIMIT_REQUESTS requests per RATE_LIMIT_WINDOW seconds (5 requests per minute by default).

    Args:
        request: FastAPI request object containing the Redis client
        user_id: The user ID extracted from the JWT token

    Raises:
        HTTPException: 429 Too Many Requests if rate limit is exceeded

    """
    redis: RedisStore = request.app.redis_store
    endpoint_scope = getattr(request.scope.get("route"), "path", request.url.path)

    is_allowed = await redis.check_rate_limit(
        user_id=user_id,
        max_requests=RATE_LIMIT_REQUESTS,
        window_seconds=RATE_LIMIT_WINDOW,
        scope=endpoint_scope,
    )
    if not is_allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Rate limit exceeded. Maximum {RATE_LIMIT_REQUESTS} requests per {RATE_LIMIT_WINDOW} seconds allowed.",
            headers={"Retry-After": str(RATE_LIMIT_WINDOW)}
        )
