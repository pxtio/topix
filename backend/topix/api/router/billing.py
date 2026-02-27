"""Billing API router for Stripe checkout, portal, and webhook."""

import logging

from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Body, Depends, HTTPException, Request, status

from topix.api.datatypes.requests import BillingCheckoutRequest, BillingPortalRequest
from topix.api.utils.billing.stripe_client import StripeApiError, StripeClient
from topix.api.utils.billing.stripe_config import get_stripe_config
from topix.api.utils.billing.stripe_webhook import verify_stripe_signature
from topix.api.utils.decorators import with_standard_response
from topix.api.utils.security import get_current_user_uid
from topix.datatypes.user_billing import BillingStatus
from topix.store.user import UserStore
from topix.store.user_billing import UserBillingStore

logger = logging.getLogger(__name__)


router = APIRouter(
    prefix="/billing",
    tags=["billing"],
    responses={404: {"description": "Not found"}},
)


def _resolve_status(value: str) -> BillingStatus:
    allowed = {"active", "trialing", "past_due", "canceled", "incomplete"}
    return value if value in allowed else "incomplete"


def _timestamp_to_datetime(value: int | None) -> datetime | None:
    if not value:
        return None
    return datetime.utcfromtimestamp(value)


def _resolve_urls(
    *,
    app_base_url: str,
    success_url: str | None = None,
    cancel_url: str | None = None,
    return_url: str | None = None,
) -> tuple[str, str, str]:
    success = success_url or f"{app_base_url}/settings/billing?checkout=success"
    cancel = cancel_url or f"{app_base_url}/settings/billing?checkout=cancel"
    portal_return = return_url or f"{app_base_url}/settings/billing"
    return success, cancel, portal_return


async def _ensure_stripe_customer(
    *,
    user_uid: str,
    user_store: UserStore,
    user_billing_store: UserBillingStore,
    stripe_client: StripeClient,
) -> str:
    billing = await user_billing_store.get_user_billing(user_uid)
    if billing and billing.stripe_customer_id:
        return billing.stripe_customer_id

    user = await user_store.get_user(user_uid)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    customer = await stripe_client.create_customer(
        email=user.email,
        name=user.name,
        user_uid=user_uid,
    )
    customer_id = customer.get("id")
    if not customer_id:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Stripe customer creation returned no customer id",
        )

    await user_billing_store.upsert_user_billing(
        user_uid=user_uid,
        data={"stripe_customer_id": customer_id},
    )
    return customer_id


@router.post("/checkout-session")
@with_standard_response
async def create_checkout_session(
    request: Request,
    user_id: Annotated[str, Depends(get_current_user_uid)],
    body: Annotated[BillingCheckoutRequest, Body(description="Stripe checkout session input")],
):
    """Create a hosted Stripe checkout session for plus subscription."""
    config = get_stripe_config()
    stripe_client = StripeClient(secret_key=config.secret_key)
    user_store: UserStore = request.app.user_store
    user_billing_store: UserBillingStore = request.app.user_billing_store
    success_url, cancel_url, _ = _resolve_urls(
        app_base_url=config.app_base_url,
        success_url=body.success_url,
        cancel_url=body.cancel_url,
    )

    try:
        customer_id = await _ensure_stripe_customer(
            user_uid=user_id,
            user_store=user_store,
            user_billing_store=user_billing_store,
            stripe_client=stripe_client,
        )
        session = await stripe_client.create_checkout_session(
            customer_id=customer_id,
            price_id=config.plus_monthly_price_id,
            success_url=success_url,
            cancel_url=cancel_url,
            user_uid=user_id,
        )
    except StripeApiError as exc:
        logger.error("Stripe checkout session failed: %s", exc, exc_info=True)
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc

    return {
        "checkout_url": session.get("url"),
        "session_id": session.get("id"),
    }


@router.get("/me")
@with_standard_response
async def get_billing_state(
    request: Request,
    user_id: Annotated[str, Depends(get_current_user_uid)],
):
    """Return billing state used by the settings UI."""
    user_billing_store: UserBillingStore = request.app.user_billing_store
    billing = await user_billing_store.get_user_billing(user_id)
    if billing is None:
        return {
            "plan": "free",
            "status": "active",
            "cancel_at_period_end": False,
            "current_period_start": None,
            "current_period_end": None,
        }

    return {
        "plan": billing.plan,
        "status": billing.status,
        "cancel_at_period_end": billing.cancel_at_period_end,
        "current_period_start": billing.current_period_start,
        "current_period_end": billing.current_period_end,
    }


@router.post("/portal-session")
@with_standard_response
async def create_portal_session(
    request: Request,
    user_id: Annotated[str, Depends(get_current_user_uid)],
    body: Annotated[BillingPortalRequest, Body(description="Stripe customer portal input")],
):
    """Create a Stripe customer portal session."""
    config = get_stripe_config()
    stripe_client = StripeClient(secret_key=config.secret_key)
    user_billing_store: UserBillingStore = request.app.user_billing_store
    _, _, return_url = _resolve_urls(
        app_base_url=config.app_base_url,
        return_url=body.return_url,
    )

    billing = await user_billing_store.get_user_billing(user_id)
    if billing is None or not billing.stripe_customer_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No Stripe customer found for user",
        )

    try:
        session = await stripe_client.create_billing_portal_session(
            customer_id=billing.stripe_customer_id,
            return_url=return_url,
        )
    except StripeApiError as exc:
        logger.error("Stripe portal session failed: %s", exc, exc_info=True)
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc

    return {
        "portal_url": session.get("url"),
    }


@router.post("/webhook")
@with_standard_response
async def handle_stripe_webhook(request: Request):
    """Handle Stripe billing webhooks and persist billing state transitions."""
    config = get_stripe_config()
    payload = await request.body()
    event = verify_stripe_signature(
        payload=payload,
        sig_header=request.headers.get("Stripe-Signature"),
        webhook_secret=config.webhook_secret,
    )

    event_type = event.get("type", "")
    data_object = event.get("data", {}).get("object", {})
    user_billing_store: UserBillingStore = request.app.user_billing_store

    if event_type == "checkout.session.completed":
        user_uid = data_object.get("client_reference_id") or data_object.get("metadata", {}).get("user_uid")
        if not user_uid:
            return {"processed": False, "reason": "missing_user_uid"}
        await user_billing_store.upsert_user_billing(
            user_uid=user_uid,
            data={
                "plan": "plus",
                "status": "active",
                "stripe_customer_id": data_object.get("customer"),
                "stripe_subscription_id": data_object.get("subscription"),
            },
        )
        return {"processed": True, "event_type": event_type}

    if event_type in {
        "customer.subscription.created",
        "customer.subscription.updated",
        "customer.subscription.deleted",
    }:
        stripe_customer_id = data_object.get("customer")
        stripe_subscription_id = data_object.get("id")
        status_value = _resolve_status(data_object.get("status", "incomplete"))

        user_uid = data_object.get("metadata", {}).get("user_uid")
        if not user_uid and stripe_subscription_id:
            billing = await user_billing_store.get_user_billing_by_stripe_subscription_id(stripe_subscription_id)
            user_uid = billing.user_uid if billing else None
        if not user_uid and stripe_customer_id:
            billing = await user_billing_store.get_user_billing_by_stripe_customer_id(stripe_customer_id)
            user_uid = billing.user_uid if billing else None

        if not user_uid:
            logger.warning("Stripe webhook %s ignored: no user mapping", event_type)
            return {"processed": False, "reason": "no_user_mapping", "event_type": event_type}

        plan = "free" if status_value == "canceled" or event_type.endswith(".deleted") else "plus"
        await user_billing_store.upsert_user_billing(
            user_uid=user_uid,
            data={
                "plan": plan,
                "status": status_value,
                "stripe_customer_id": stripe_customer_id,
                "stripe_subscription_id": stripe_subscription_id,
                "current_period_start": _timestamp_to_datetime(data_object.get("current_period_start")),
                "current_period_end": _timestamp_to_datetime(data_object.get("current_period_end")),
                "cancel_at_period_end": bool(data_object.get("cancel_at_period_end", False)),
            },
        )
        return {"processed": True, "event_type": event_type}

    return {"processed": False, "event_type": event_type, "reason": "ignored_event"}
