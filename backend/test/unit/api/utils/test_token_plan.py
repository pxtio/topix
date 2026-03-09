"""Unit tests for JWT plan resolution helper."""

from types import SimpleNamespace

import pytest

from topix.api.utils.rate_limit.token_plan import BILLING_ENABLED_ENV, resolve_plan_for_token


class _FailIfCalledStore:
    """Store stub that should never be called."""

    async def get_user_billing(self, user_uid: str):
        raise AssertionError(f"store should not be called for user {user_uid}")


class _StubBillingStore:
    """Store stub that returns a fixed billing row."""

    def __init__(self, plan: str | None):
        self.plan = plan
        self.calls: list[str] = []

    async def get_user_billing(self, user_uid: str):
        self.calls.append(user_uid)
        if self.plan is None:
            return None
        return SimpleNamespace(plan=self.plan)


@pytest.mark.asyncio
async def test_resolve_plan_returns_plus_when_billing_disabled(monkeypatch):
    """Billing disabled should force plus plan for token claims."""
    monkeypatch.delenv(BILLING_ENABLED_ENV, raising=False)
    request = SimpleNamespace(app=SimpleNamespace(user_billing_store=_FailIfCalledStore()))

    plan = await resolve_plan_for_token(request, "user-1")

    assert plan == "plus"


@pytest.mark.asyncio
async def test_resolve_plan_returns_free_when_store_missing(monkeypatch):
    """Billing enabled but no store should fallback to free."""
    monkeypatch.setenv(BILLING_ENABLED_ENV, "true")
    request = SimpleNamespace(app=SimpleNamespace())

    plan = await resolve_plan_for_token(request, "user-1")

    assert plan == "free"


@pytest.mark.asyncio
async def test_resolve_plan_returns_free_when_billing_row_missing(monkeypatch):
    """Billing enabled with no row should fallback to free."""
    monkeypatch.setenv(BILLING_ENABLED_ENV, "true")
    store = _StubBillingStore(plan=None)
    request = SimpleNamespace(app=SimpleNamespace(user_billing_store=store))

    plan = await resolve_plan_for_token(request, "user-1")

    assert plan == "free"
    assert store.calls == ["user-1"]


@pytest.mark.asyncio
async def test_resolve_plan_returns_persisted_plan(monkeypatch):
    """Billing enabled should return persisted plus/free plan."""
    monkeypatch.setenv(BILLING_ENABLED_ENV, "true")
    store = _StubBillingStore(plan="plus")
    request = SimpleNamespace(app=SimpleNamespace(user_billing_store=store))

    plan = await resolve_plan_for_token(request, "user-1")

    assert plan == "plus"
    assert store.calls == ["user-1"]
