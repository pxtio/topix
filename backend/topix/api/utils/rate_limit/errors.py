"""Error helpers for rate limiting."""

from fastapi import HTTPException, status

from topix.api.utils.rate_limit.types import PlanType, RateLimitRule


def raise_rate_limit_exceeded(rule: RateLimitRule, plan: PlanType, retry_after: int) -> None:
    """Raise a standardized 429 error for a failed rule."""
    unit = "minute" if rule.period == "minute" else ("day" if rule.period == "day" else "month")
    raise HTTPException(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        detail=(
            f"{rule.period.capitalize()} quota exceeded for plan `{plan}`. "
            f"Limit: {rule.limit} requests/{unit}."
        ),
        headers={"Retry-After": str(retry_after)},
    )
