"""Stripe webhook signature verification helpers."""

import hashlib
import hmac
import json
import time

from fastapi import HTTPException, status


def _parse_signature_header(sig_header: str) -> tuple[int, list[str]]:
    parts = [part.strip() for part in sig_header.split(",") if part.strip()]
    timestamp = None
    signatures: list[str] = []
    for part in parts:
        key, _, value = part.partition("=")
        if key == "t":
            try:
                timestamp = int(value)
            except ValueError as exc:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid Stripe signature timestamp",
                ) from exc
        elif key == "v1":
            signatures.append(value)

    if timestamp is None or not signatures:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid Stripe signature header",
        )
    return timestamp, signatures


def verify_stripe_signature(
    *,
    payload: bytes,
    sig_header: str | None,
    webhook_secret: str,
    tolerance_seconds: int = 300,
) -> dict:
    """Verify Stripe webhook signature and return parsed JSON event."""
    if not sig_header:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing Stripe-Signature header",
        )

    timestamp, signatures = _parse_signature_header(sig_header)
    now = int(time.time())
    if abs(now - timestamp) > tolerance_seconds:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Stripe signature timestamp outside tolerance",
        )

    try:
        payload_text = payload.decode("utf-8")
    except UnicodeDecodeError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid Stripe webhook payload encoding",
        ) from exc

    signed_payload = f"{timestamp}.{payload_text}"
    expected = hmac.new(
        webhook_secret.encode("utf-8"),
        signed_payload.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()

    if not any(hmac.compare_digest(expected, sig) for sig in signatures):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid Stripe webhook signature",
        )

    try:
        return json.loads(payload_text)
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid Stripe webhook JSON payload",
        ) from exc
