"""Window helpers used by rate limit checks."""

from topix.api.utils.rate_limit.types import RateLimitPeriod


def period_label(period: RateLimitPeriod) -> str:
    """Return a human label for a period."""
    if period == "minute":
        return "minute"
    if period == "day":
        return "day"
    return "month"
