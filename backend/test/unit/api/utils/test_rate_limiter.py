"""Tests for the Redis-based rate limiter dependency."""

from types import SimpleNamespace

import pytest

from fastapi import HTTPException, status

from topix.api.utils.rate_limiter import (
    RATE_LIMIT_REQUESTS,
    RATE_LIMIT_WINDOW,
    rate_limiter,
)


class _FakeRedisStore:
    """Helper store that tracks how rate-limit checks are invoked."""

    def __init__(self, is_allowed: bool):
        self.is_allowed = is_allowed
        self.calls = []

    async def check_rate_limit(
        self,
        user_id: str,
        max_requests: int,
        window_seconds: int,
        scope: str | None = None,
    ) -> bool:
        self.calls.append(
            {
                "user_id": user_id,
                "max_requests": max_requests,
                "window_seconds": window_seconds,
                "scope": scope,
            }
        )
        return self.is_allowed


@pytest.mark.asyncio
async def test_rate_limiter_allows_requests_within_limits():
    """Should return without raising when the Redis store allows the request."""
    fake_store = _FakeRedisStore(is_allowed=True)
    request = SimpleNamespace(
        app=SimpleNamespace(redis_store=fake_store),
        scope={"route": SimpleNamespace(path="/foo")},
        url=SimpleNamespace(path="/fallback"),
    )

    result = await rate_limiter(request=request, user_id="user-123")

    assert result is None
    assert fake_store.calls == [
        {
            "user_id": "user-123",
            "max_requests": RATE_LIMIT_REQUESTS,
            "window_seconds": RATE_LIMIT_WINDOW,
            "scope": "/foo",
        }
    ]


@pytest.mark.asyncio
async def test_rate_limiter_raises_when_limit_exceeded():
    """Should raise HTTPException 429 when Redis indicates the limit is exceeded."""
    fake_store = _FakeRedisStore(is_allowed=False)
    request = SimpleNamespace(
        app=SimpleNamespace(redis_store=fake_store),
        scope={"route": SimpleNamespace(path="/foo")},
        url=SimpleNamespace(path="/fallback"),
    )

    with pytest.raises(HTTPException) as exc:
        await rate_limiter(request=request, user_id="user-123")

    assert exc.value.status_code == status.HTTP_429_TOO_MANY_REQUESTS
    assert f"{RATE_LIMIT_REQUESTS} requests per {RATE_LIMIT_WINDOW} seconds" in exc.value.detail
    assert exc.value.headers == {"Retry-After": str(RATE_LIMIT_WINDOW)}
