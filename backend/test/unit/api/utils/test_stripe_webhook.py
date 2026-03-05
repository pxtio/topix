"""Unit tests for Stripe webhook signature verification."""

import hashlib
import hmac
import json
import time

import pytest

from fastapi import HTTPException

from topix.api.utils.billing.stripe_webhook import verify_stripe_signature


def _build_sig_header(payload: bytes, secret: str, timestamp: int) -> str:
    signed_payload = f"{timestamp}.{payload.decode('utf-8')}"
    digest = hmac.new(
        secret.encode("utf-8"),
        signed_payload.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    return f"t={timestamp},v1={digest}"


def test_verify_stripe_signature_accepts_valid_payload():
    """Should accept valid Stripe signatures and return event payload."""
    secret = "whsec_test"
    payload = json.dumps({"id": "evt_1", "type": "checkout.session.completed"}).encode("utf-8")
    ts = int(time.time())
    header = _build_sig_header(payload, secret, ts)

    event = verify_stripe_signature(payload=payload, sig_header=header, webhook_secret=secret)

    assert event["id"] == "evt_1"
    assert event["type"] == "checkout.session.completed"


def test_verify_stripe_signature_rejects_invalid_signature():
    """Should raise HTTPException when signature does not match payload."""
    secret = "whsec_test"
    payload = json.dumps({"id": "evt_1"}).encode("utf-8")
    ts = int(time.time())
    header = f"t={ts},v1=invalid"

    with pytest.raises(HTTPException) as exc:
        verify_stripe_signature(payload=payload, sig_header=header, webhook_secret=secret)

    assert exc.value.status_code == 400
    assert "Invalid Stripe webhook signature" in exc.value.detail


def test_verify_stripe_signature_rejects_stale_timestamp():
    """Should reject signatures with timestamps outside tolerance window."""
    secret = "whsec_test"
    payload = json.dumps({"id": "evt_1"}).encode("utf-8")
    old_ts = int(time.time()) - 1200
    header = _build_sig_header(payload, secret, old_ts)

    with pytest.raises(HTTPException) as exc:
        verify_stripe_signature(payload=payload, sig_header=header, webhook_secret=secret)

    assert exc.value.status_code == 400
    assert "outside tolerance" in exc.value.detail
