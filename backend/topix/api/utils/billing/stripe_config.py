"""Stripe runtime configuration helpers."""

import os

from dataclasses import dataclass

from fastapi import HTTPException, status


@dataclass(frozen=True)
class StripeConfig:
    """Runtime Stripe configuration loaded from environment variables."""

    secret_key: str
    webhook_secret: str
    plus_monthly_price_id: str
    app_base_url: str


def _read_env(name: str) -> str | None:
    value = os.getenv(name)
    if value is None:
        return None
    stripped = value.strip()
    return stripped or None


def get_stripe_config() -> StripeConfig:
    """Load Stripe settings from env and fail fast when missing."""
    secret_key = _read_env("STRIPE_SECRET_KEY")
    webhook_secret = _read_env("STRIPE_WEBHOOK_SECRET")
    plus_monthly_price_id = _read_env("STRIPE_PRICE_PLUS_MONTHLY")
    app_base_url = _read_env("APP_BASE_URL")

    missing = [
        name
        for name, value in (
            ("STRIPE_SECRET_KEY", secret_key),
            ("STRIPE_WEBHOOK_SECRET", webhook_secret),
            ("STRIPE_PRICE_PLUS_MONTHLY", plus_monthly_price_id),
            ("APP_BASE_URL", app_base_url),
        )
        if value is None
    ]
    if missing:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Stripe is not configured. Missing env: {', '.join(missing)}",
        )

    return StripeConfig(
        secret_key=secret_key,
        webhook_secret=webhook_secret,
        plus_monthly_price_id=plus_monthly_price_id,
        app_base_url=app_base_url.rstrip("/"),
    )
