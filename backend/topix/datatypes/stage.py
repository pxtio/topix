"""Stage Enum."""

from topix.datatypes.enum import CustomEnum


class StageEnum(str, CustomEnum):
    """Enum for different stages of the agent's operation."""

    LOCAL = "local"
    TEST = "test"
    DEV = "dev"
    STAGING = "staging"
    PROD = "prod"
