"""Utils for web search."""
import logging

from datetime import datetime, timedelta

from topix.datatypes.recurrence import Recurrence

logger = logging.getLogger(__name__)


def get_from_date(recency: Recurrence, now: datetime = None) -> datetime:
    """Get the from_date for a given recency.

    Convert current datetime and recency ('daily', 'weekly', 'monthly', 'yearly')
    into a datetime usable as a from_date filter.
    """
    if now is None:
        now = datetime.now()

    today = now.date()

    match recency:
        case Recurrence.DAILY:
            return today - timedelta(days=2)
        case Recurrence.WEEKLY:
            return today - timedelta(days=8)
        case Recurrence.MONTHLY:
            return today - timedelta(days=31)
        case Recurrence.YEARLY:
            return today - timedelta(days=366)
        case _:
            raise ValueError(f"Invalid recency: {recency}. Must be one of 'daily', 'weekly', 'monthly', 'yearly'.")


def pretty_date(iso_str: str) -> str | None:
    """Convert ISO datetime string to a readable format like 'Sep 3rd, 2025'."""
    try:
        dt = datetime.fromisoformat(iso_str)
    except ValueError:
        logger.warning(f"Invalid ISO datetime string: {iso_str}")
        return None
    day = dt.day

    # Determine suffix
    if 10 <= day % 100 <= 20:
        suffix = "th"
    else:
        suffix = {1: "st", 2: "nd", 3: "rd"}.get(day % 10, "th")

    return dt.strftime(f"%b {day}{suffix}, %Y")
