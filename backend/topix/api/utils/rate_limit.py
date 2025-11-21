from fastapi import Depends, HTTPException, Request
import time

TIME_WINDOW = 60_000  # 1 minute in ms
RATE_LIMIT = 5        # 5 requests per minute


async def rate_limit(request: Request):
    # Extract user_id from query params
    user_id = request.query_params.get("user_id")
    if not user_id:
        raise HTTPException(status_code=400, detail="Missing user_id in query params")

    key = f"ratelimit:{user_id}"
    now = int(time.time() * 1000)

    # Remove timestamps older than 60 seconds
    await request.app.state.redis.zremrangebyscore(key, 0, now - TIME_WINDOW)

    # Count only recent timestamps
    req_count = await request.app.state.redis.zcount(key, now - TIME_WINDOW, now)

    if req_count >= RATE_LIMIT:
        raise HTTPException(status_code=429, detail="Rate limit exceeded")

    # Add new timestamp
    await request.app.state.redis.zadd(key, {str(now): now})

    # Set expiration so Redis auto-cleans unused keys
    await request.app.state.redis.expire(key, 120)