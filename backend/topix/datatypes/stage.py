"""Stage Enum."""

from enum import StrEnum


class StageEnum(StrEnum):
    """Enum for different stages of the agent's operation."""

    LOCAL = "local"
    TEST = "test"
    DEV = "dev"
    STAGING = "staging"
    PROD = "prod"
