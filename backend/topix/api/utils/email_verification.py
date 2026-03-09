"""Email verification helpers."""

from __future__ import annotations

import hashlib
import os
import secrets

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode

import httpx

from fastapi import HTTPException, status

EMAIL_VERIFICATION_ENABLED_ENV = "EMAIL_VERIFICATION_ENABLED"
EMAIL_VERIFICATION_TTL_HOURS_ENV = "EMAIL_VERIFICATION_TTL_HOURS"
RESEND_API_KEY_ENV = "RESEND_API_KEY"
RESEND_FROM_EMAIL_ENV = "RESEND_FROM_EMAIL"
APP_BASE_URL_ENV = "APP_BASE_URL"

DEFAULT_EMAIL_VERIFICATION_TTL_HOURS = 24
DEFAULT_RESEND_COOLDOWN_SECONDS = 60


def _build_verification_email_content(
    verification_url: str,
    ttl_hours: int,
) -> tuple[str, str]:
    """Build HTML and plain-text verification email bodies for better deliverability."""
    expiration_label = f"{ttl_hours} hour{'s' if ttl_hours != 1 else ''}"

    text_body = (
        "Welcome to Dim0!\n\n"
        "Please confirm your email address to finish setting up your account.\n\n"
        f"Verify your email: {verification_url}\n\n"
        f"This verification link expires in {expiration_label}.\n\n"
        "If you did not create a Dim0 account, you can safely ignore this email."
    )

    html_body = (
        "<div style=\"font-family: Arial, sans-serif; color: #111827; line-height: 1.6;\">"
        "<p>Welcome to <strong>Dim0</strong>!</p>"
        "<p>Please confirm your email address to finish setting up your account.</p>"
        f"<p><a href=\"{verification_url}\" "
        "style=\"display: inline-block; padding: 10px 16px; background: #111827; color: #ffffff; "
        "text-decoration: none; border-radius: 6px; font-weight: 600;\">Verify email</a></p>"
        "<p>If the button doesn't work, copy and paste this link into your browser:</p>"
        f"<p><a href=\"{verification_url}\">{verification_url}</a></p>"
        f"<p>This verification link expires in <strong>{expiration_label}</strong>.</p>"
        "<p>If you did not create a Dim0 account, you can safely ignore this email.</p>"
        "</div>"
    )

    return html_body, text_body


@dataclass(frozen=True)
class EmailVerificationConfig:
    """Runtime settings for email verification delivery."""

    resend_api_key: str
    resend_from_email: str
    app_base_url: str
    ttl_hours: int


def _is_truthy(value: str | None) -> bool:
    """Parse common truthy env string values."""
    if value is None:
        return False
    return value.strip().lower() in {"1", "true", "yes", "on"}


def is_email_verification_enabled() -> bool:
    """Return whether email verification is explicitly enabled."""
    return _is_truthy(os.getenv(EMAIL_VERIFICATION_ENABLED_ENV))


def _read_env(name: str) -> str | None:
    value = os.getenv(name)
    if value is None:
        return None
    stripped = value.strip()
    return stripped or None


def get_email_verification_config() -> EmailVerificationConfig:
    """Load email verification env settings and fail fast when incomplete."""
    resend_api_key = _read_env(RESEND_API_KEY_ENV)
    resend_from_email = _read_env(RESEND_FROM_EMAIL_ENV)
    app_base_url = _read_env(APP_BASE_URL_ENV)
    ttl_hours_raw = _read_env(EMAIL_VERIFICATION_TTL_HOURS_ENV)
    ttl_hours = int(ttl_hours_raw) if ttl_hours_raw else DEFAULT_EMAIL_VERIFICATION_TTL_HOURS

    missing = [
        name
        for name, value in (
            (RESEND_API_KEY_ENV, resend_api_key),
            (RESEND_FROM_EMAIL_ENV, resend_from_email),
            (APP_BASE_URL_ENV, app_base_url),
        )
        if value is None
    ]
    if missing:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Email verification is not configured. Missing env: {', '.join(missing)}",
        )

    return EmailVerificationConfig(
        resend_api_key=resend_api_key,
        resend_from_email=resend_from_email,
        app_base_url=app_base_url.rstrip("/"),
        ttl_hours=max(1, ttl_hours),
    )


def generate_email_verification_token() -> str:
    """Generate a random URL-safe verification token."""
    return secrets.token_urlsafe(32)


def hash_email_verification_token(raw_token: str) -> str:
    """Hash a verification token for secure persistence."""
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


def build_email_verification_url(app_base_url: str, raw_token: str) -> str:
    """Build frontend verification URL with token query parameter."""
    query = urlencode({"token": raw_token})
    return f"{app_base_url}/verify-email?{query}"


def compute_verification_expiry(now: datetime, ttl_hours: int) -> datetime:
    """Compute token expiry timestamp from UTC now + ttl."""
    return now + timedelta(hours=ttl_hours)


async def send_email_verification_link(
    *,
    resend_api_key: str,
    resend_from_email: str,
    to_email: str,
    verification_url: str,
    ttl_hours: int,
) -> None:
    """Send verification email through Resend REST API."""
    headers = {
        "Authorization": f"Bearer {resend_api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "from": resend_from_email,
        "to": [to_email],
        "subject": "Verify your Dim0 email",
    }
    html_body, text_body = _build_verification_email_content(
        verification_url=verification_url,
        ttl_hours=ttl_hours,
    )
    payload["html"] = html_body
    payload["text"] = text_body

    async with httpx.AsyncClient(timeout=20.0) as client:
        response = await client.post(
            "https://api.resend.com/emails",
            headers=headers,
            json=payload,
        )

    if response.status_code >= 400:
        detail = response.text or "Failed to send verification email"
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Email provider error: {detail}",
        )


def utc_now() -> datetime:
    """Return current UTC timestamp."""
    return datetime.now(timezone.utc)
