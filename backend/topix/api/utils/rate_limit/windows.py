"""Window helpers used by rate limit checks."""

from datetime import datetime, timezone

from topix.api.utils.rate_limit.types import RateLimitPeriod


def period_label(period: RateLimitPeriod) -> str:
    """Return a human label for a period."""
    if period == "minute":
        return "minute"
    if period == "day":
        return "day"
    return "month"


def as_utc(dt: datetime) -> datetime:
    """Normalize a datetime to UTC (assume UTC if naive)."""
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)
