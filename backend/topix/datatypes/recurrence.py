"""Recurrence enum."""

from enum import StrEnum


class Recurrence(StrEnum):
    """Recurrence enum."""

    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    YEARLY = "yearly"
