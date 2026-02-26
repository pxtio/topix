"""Rate limit policy definitions."""

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


def build_rate_limit_rules(entitlement: EntitlementContext) -> list[RateLimitRule]:
    """Build ordered rules for the given entitlement."""
    plan = entitlement.plan

    return [
        RateLimitRule(
            name="minute",
            period="minute",
            limit=MINUTE_BURST_LIMITS.get(plan, MINUTE_BURST_LIMITS["free"]),
            kind="fixed_utc",
            scope="tier_usage",
        ),
        RateLimitRule(
            name="day",
            period="day",
            limit=DAILY_UTC_LIMITS.get(plan, DAILY_UTC_LIMITS["free"]),
            kind="fixed_utc",
            scope="tier_usage",
        ),
        RateLimitRule(
            name="month",
            period="month",
            limit=MONTHLY_UTC_LIMITS.get(plan, MONTHLY_UTC_LIMITS["free"]),
            kind="fixed_utc",
            scope="tier_usage",
        ),
    ]
