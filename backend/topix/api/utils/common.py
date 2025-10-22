"""Common utility functions."""
from datetime import datetime


def iso_to_clear_date(iso_date: str) -> str:
    """Convert an ISO 8601 date string to a clear, human-readable format with weekday.

    Example:
        >>> iso_to_clear_date("2025-10-22T14:30:00Z")
        'Wednesday, October 22, 2025 at 14:30 UTC'

    """
    try:
        # Handle 'Z' (Zulu) as UTC timezone
        if iso_date.endswith('Z'):
            dt = datetime.fromisoformat(iso_date.replace('Z', '+00:00'))
        else:
            dt = datetime.fromisoformat(iso_date)

        # Base readable format with weekday
        readable = dt.strftime("%A, %B %d, %Y at %H:%M %Z")

        # Handle missing timezone names or offsets
        if not dt.tzinfo:
            return dt.strftime("%A, %B %d, %Y at %H:%M")
        elif not dt.tzname():
            return f"{dt.strftime('%A, %B %d, %Y at %H:%M')} UTC{dt.strftime('%z')}"

        return readable
    except ValueError:
        return "Invalid ISO date format"
