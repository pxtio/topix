"""Orchestration service for rate limit checks."""

from fastapi import Request

from topix.api.utils.rate_limit.entitlements import resolve_entitlement_context
from topix.api.utils.rate_limit.errors import raise_rate_limit_exceeded
from topix.api.utils.rate_limit.policy import build_rate_limit_rules
from topix.store.redis.store import RedisStore


async def enforce_rate_limit(request: Request, user_uid: str) -> None:
    """Enforce all configured rate limit rules for the request."""
    redis: RedisStore = request.app.redis_store
    entitlement = await resolve_entitlement_context(request, user_uid)
    rules = build_rate_limit_rules(entitlement)

    for rule in rules:
        if rule.kind != "fixed_utc":
            # Reserved for cycle-window implementation.
            continue

        allowed, retry_after = await redis.check_fixed_window_quota(
            user_id=user_uid,
            limit=rule.limit,
            period=rule.period,
            scope=rule.scope,
        )
        if not allowed:
            raise_rate_limit_exceeded(rule, entitlement.plan, retry_after)
