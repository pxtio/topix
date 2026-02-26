"""Rate limit policy definitions.

Minute/day rules use UTC fixed windows. Monthly switches to billing-cycle windows
when entitlement contains cycle bounds; otherwise it falls back to UTC month.
"""

import os

from topix.api.utils.rate_limit.types import EntitlementContext, PlanType, RateLimitRule

MINUTE_BURST_LIMITS: dict[PlanType, int] = {
    "free": 10,
    "plus": 10,
}

DAILY_UTC_LIMITS: dict[PlanType, int] = {
    "free": 10,
    "plus": 200,
}

MONTHLY_UTC_LIMITS: dict[PlanType, int] = {
    "free": 100,
    "plus": 5000,
}

BILLING_ENABLED_ENV = "VITE_BILLING_ENABLED"


def _is_truthy(value: str | None) -> bool:
    """Parse common truthy env values."""
    if value is None:
        return False
    return value.strip().lower() in {"1", "true", "yes", "on"}


def resolve_tier_limits(plan: PlanType) -> dict[str, int]:
    """Resolve minute/day/month limits for a plan with billing mode fallback.

    When billing is disabled (default), free and plus both get plus limits.
    """
    billing_enabled = _is_truthy(os.getenv(BILLING_ENABLED_ENV))

    if not billing_enabled:
        return {
            "minute": MINUTE_BURST_LIMITS["plus"],
            "day": DAILY_UTC_LIMITS["plus"],
            "month": MONTHLY_UTC_LIMITS["plus"],
        }

    return {
        "minute": MINUTE_BURST_LIMITS.get(plan, MINUTE_BURST_LIMITS["free"]),
        "day": DAILY_UTC_LIMITS.get(plan, DAILY_UTC_LIMITS["free"]),
        "month": MONTHLY_UTC_LIMITS.get(plan, MONTHLY_UTC_LIMITS["free"]),
    }


def build_rate_limit_rules(entitlement: EntitlementContext) -> list[RateLimitRule]:
    """Build ordered rules for the given entitlement."""
    plan = entitlement.plan
    limits = resolve_tier_limits(plan)

    monthly_kind = "cycle" if entitlement.cycle is not None else "fixed_utc"

    return [
        RateLimitRule(
            name="minute",
            period="minute",
            limit=limits["minute"],
            kind="fixed_utc",
            scope="tier_usage",
        ),
        RateLimitRule(
            name="day",
            period="day",
            limit=limits["day"],
            kind="fixed_utc",
            scope="tier_usage",
        ),
        RateLimitRule(
            name="month",
            period="month",
            limit=limits["month"],
            kind=monthly_kind,
            scope="tier_usage",
        ),
    ]
