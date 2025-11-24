"""Utilities for loading secrets from Doppler."""

import logging
import os
import secrets

from dopplersdk import DopplerSDK

from topix.datatypes.stage import StageEnum

logger = logging.getLogger(__name__)


def generate_jwt_secret() -> str:
    """Generate a secure random JWT secret key."""
    logger.info("Generating a new JWT secret.")
    return secrets.token_urlsafe(64)


def load_secrets(
    stage: StageEnum = StageEnum.LOCAL
):
    """Load secrets from Doppler based on the provided stage."""
    if stage in [StageEnum.LOCAL, StageEnum.DEV, StageEnum.TEST]:
        secret_name = f"dev_{stage}"
    else:
        secret_name = stage
    doppler = DopplerSDK()
    doppler.set_access_token(os.getenv("DOPPLER_TOKEN"))
    secret = doppler.secrets.get("CONFIG", secret_name, "topix")
    logger.info("Loaded secrets for stage `%s`.", stage)
    return secret.value['raw']
