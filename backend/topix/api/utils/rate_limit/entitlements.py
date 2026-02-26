"""Entitlement resolution for rate limiting."""

from fastapi import Request

from topix.api.utils.rate_limit.types import EntitlementContext, PlanType
from topix.store.user_billing import UserBillingStore

DEFAULT_PLAN: PlanType = "free"


async def resolve_entitlement_context(request: Request, user_uid: str) -> EntitlementContext:
    """Resolve plan and optional billing context for the request user."""
    store: UserBillingStore | None = getattr(request.app, "user_billing_store", None)
    if store is None:
        return EntitlementContext(plan=DEFAULT_PLAN)

    billing = await store.get_user_billing(user_uid)
    if billing is None:
        return EntitlementContext(plan=DEFAULT_PLAN)

    return EntitlementContext(plan=billing.plan)
