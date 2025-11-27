"""Tests for the async_retry decorator."""

import asyncio

import pytest

from topix.utils.retry import async_retry


@pytest.mark.asyncio
async def test_async_retry_eventual_success(monkeypatch):
    """Should retry on the specified exception type and eventually succeed."""
    calls = {"count": 0}

    @async_retry(retries=3, delay_ms=10, exceptions=(ValueError,))
    async def flaky():
        calls["count"] += 1
        # Fail first 2 times, succeed on 3rd
        if calls["count"] < 3:
            raise ValueError("temporary")
        return "ok"

    # Patch sleep so tests run fast and deterministically
    async def fake_sleep(_):
        return None

    monkeypatch.setattr(asyncio, "sleep", fake_sleep)

    result = await flaky()
    assert result == "ok"
    # 3 calls total: 1 initial + 2 retries
    assert calls["count"] == 3


@pytest.mark.asyncio
async def test_async_retry_raises_after_exhaustion(monkeypatch):
    """Should raise after all retries are exhausted."""
    calls = {"count": 0}

    @async_retry(retries=2, delay_ms=10, exceptions=(ValueError,))
    async def always_fails():
        calls["count"] += 1
        raise ValueError("still broken")

    async def fake_sleep(_):
        return None

    monkeypatch.setattr(asyncio, "sleep", fake_sleep)

    with pytest.raises(ValueError, match="still broken"):
        await always_fails()

    # 3 calls total: initial + 2 retries
    assert calls["count"] == 3


@pytest.mark.asyncio
async def test_async_retry_does_not_retry_on_other_exceptions(monkeypatch):
    """Should NOT retry if exception type is not in 'exceptions' tuple."""
    calls = {"count": 0}

    @async_retry(retries=5, delay_ms=10, exceptions=(ValueError,))
    async def wrong_error():
        calls["count"] += 1
        # This is not in (ValueError,), so no retry should happen
        raise RuntimeError("boom")

    async def fake_sleep(_):
        return None

    monkeypatch.setattr(asyncio, "sleep", fake_sleep)

    with pytest.raises(RuntimeError, match="boom"):
        await wrong_error()

    # Only 1 call, no retries
    assert calls["count"] == 1
