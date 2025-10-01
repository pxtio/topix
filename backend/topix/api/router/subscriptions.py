"""Subscription-related API routes."""

import logging

from typing import Annotated

from fastapi import APIRouter, Depends, Request, Response
from fastapi.params import Query

from topix.api.helpers import with_standard_response
from topix.api.utils.security import get_current_user_uid
from topix.store.subscription import SubscriptionStore

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/subscriptions",
    tags=["subscriptions"],
    responses={404: {"description": "Not found"}},
)


@router.put("/", include_in_schema=False)
@router.put("")
@with_standard_response
async def create_subscription(
    response: Response,
    request: Request,
    user_id: Annotated[str, Depends(get_current_user_uid)],
    topic: Annotated[str, Query(description="Topic for the subscription")],
    raw_description: Annotated[str | None, Query(description="Optional raw description")] = "",
):
    """Create a new subscription for the user."""
    store: SubscriptionStore = request.app.subscription_store
    sub = await store.create_subscription(user_id, topic, raw_description or "")
    return {"subscription_id": sub.uid}
