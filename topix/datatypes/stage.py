from topix.datatypes.enum import CustomEnum


class StageEnum(str, CustomEnum):
    LOCAL = "local"
    TEST = "test"
    DEV = "dev"
    STAGING = "staging"
    PROD = "prod"
