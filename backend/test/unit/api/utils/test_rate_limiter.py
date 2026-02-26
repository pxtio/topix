"""Tests for the modular rate limiter dependency."""

from types import SimpleNamespace

import pytest

from fastapi import HTTPException, status

from topix.api.utils.rate_limit.dependency import rate_limiter
from topix.api.utils.rate_limit.policy import DAILY_UTC_LIMITS, MINUTE_BURST_LIMITS, MONTHLY_UTC_LIMITS


class _FakeRedisStore:
    """Helper store that tracks fixed-window quota checks."""

    def __init__(
        self,
        minute_allowed: bool = True,
        day_allowed: bool = True,
        month_allowed: bool = True,
    ):
        self.minute_allowed = minute_allowed
        self.day_allowed = day_allowed
        self.month_allowed = month_allowed
        self.calls = []

    async def check_fixed_window_quota(
        self,
        user_id: str,
        limit: int,
        period: str,
        scope: str = "tier_usage",
    ) -> tuple[bool, int]:
        self.calls.append(
            {
                "user_id": user_id,
                "limit": limit,
                "period": period,
                "scope": scope,
            }
        )
        if period == "minute":
            return self.minute_allowed, 60
        if period == "day":
            return self.day_allowed, 3600
        return self.month_allowed, 7200


class _FakeUserBillingStore:
    """Helper store that returns a fixed plan or no billing row."""

    def __init__(self, plan: str | None):
        self.plan = plan

    async def get_user_billing(self, user_uid: str):
        if self.plan is None:
            return None
        return SimpleNamespace(plan=self.plan)


def _build_request(redis_store: _FakeRedisStore, plan: str | None):
    return SimpleNamespace(
        app=SimpleNamespace(
            redis_store=redis_store,
            user_billing_store=_FakeUserBillingStore(plan=plan),
        ),
        scope={"route": SimpleNamespace(path="/foo")},
        url=SimpleNamespace(path="/fallback"),
    )


@pytest.mark.asyncio
async def test_rate_limiter_uses_free_limits_when_billing_missing():
    """Should apply free limits when no billing row exists."""
    fake_store = _FakeRedisStore()
    request = _build_request(fake_store, plan=None)

    await rate_limiter(request=request, user_id="user-123")

    assert fake_store.calls == [
        {
            "user_id": "user-123",
            "limit": MINUTE_BURST_LIMITS["free"],
            "period": "minute",
            "scope": "tier_usage",
        },
        {
            "user_id": "user-123",
            "limit": DAILY_UTC_LIMITS["free"],
            "period": "day",
            "scope": "tier_usage",
        },
        {
            "user_id": "user-123",
            "limit": MONTHLY_UTC_LIMITS["free"],
            "period": "month",
            "scope": "tier_usage",
        },
    ]


@pytest.mark.asyncio
async def test_rate_limiter_uses_plus_limits():
    """Should apply plus daily/monthly limits and shared minute cap."""
    fake_store = _FakeRedisStore()
    request = _build_request(fake_store, plan="plus")

    await rate_limiter(request=request, user_id="user-123")

    assert fake_store.calls == [
        {
            "user_id": "user-123",
            "limit": MINUTE_BURST_LIMITS["plus"],
            "period": "minute",
            "scope": "tier_usage",
        },
        {
            "user_id": "user-123",
            "limit": DAILY_UTC_LIMITS["plus"],
            "period": "day",
            "scope": "tier_usage",
        },
        {
            "user_id": "user-123",
            "limit": MONTHLY_UTC_LIMITS["plus"],
            "period": "month",
            "scope": "tier_usage",
        },
    ]


@pytest.mark.asyncio
async def test_rate_limiter_raises_on_minute_limit():
    """Should raise 429 when minute quota is exceeded."""
    fake_store = _FakeRedisStore(minute_allowed=False)
    request = _build_request(fake_store, plan="free")

    with pytest.raises(HTTPException) as exc:
        await rate_limiter(request=request, user_id="user-123")

    assert exc.value.status_code == status.HTTP_429_TOO_MANY_REQUESTS
    assert "Limit: 10 requests/minute" in exc.value.detail
    assert exc.value.headers == {"Retry-After": "60"}


@pytest.mark.asyncio
async def test_rate_limiter_raises_on_daily_limit():
    """Should raise 429 when daily quota is exceeded."""
    fake_store = _FakeRedisStore(day_allowed=False)
    request = _build_request(fake_store, plan="free")

    with pytest.raises(HTTPException) as exc:
        await rate_limiter(request=request, user_id="user-123")

    assert exc.value.status_code == status.HTTP_429_TOO_MANY_REQUESTS
    assert "Limit: 10 requests/day" in exc.value.detail
    assert exc.value.headers == {"Retry-After": "3600"}


@pytest.mark.asyncio
async def test_rate_limiter_raises_on_monthly_limit():
    """Should raise 429 when monthly quota is exceeded."""
    fake_store = _FakeRedisStore(month_allowed=False)
    request = _build_request(fake_store, plan="plus")

    with pytest.raises(HTTPException) as exc:
        await rate_limiter(request=request, user_id="user-123")

    assert exc.value.status_code == status.HTTP_429_TOO_MANY_REQUESTS
    assert "Limit: 5000 requests/month" in exc.value.detail
    assert exc.value.headers == {"Retry-After": "7200"}
