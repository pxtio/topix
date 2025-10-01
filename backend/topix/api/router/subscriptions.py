"""Subscription-related API routes."""

import logging

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.params import Body, Path, Query

from topix.api.datatypes.requests import AddSubscriptionRequest, SubscriptionUpdateRequest
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
    body: Annotated[AddSubscriptionRequest, Body(description="Subscription creation data")],
):
    """Create a new subscription for the user."""
    store: SubscriptionStore = request.app.subscription_store
    sub = await store.create_subscription(user_id, body.topic, body.raw_description or "")
    return {"subscription": sub.model_dump(exclude_none=True)}


@router.get("/", include_in_schema=False)
@router.get("")
@with_standard_response
async def list_subscriptions(
    response: Response,
    request: Request,
    user_id: Annotated[str, Depends(get_current_user_uid)],
):
    """List all subscriptions for the user."""
    store: SubscriptionStore = request.app.subscription_store
    subs = await store.list_subscriptions(user_id)
    return {"subscriptions": [sub.model_dump(exclude_none=True) for sub in subs]}


@router.get("/{subscription_id}/", include_in_schema=False)
@router.get("/{subscription_id}")
@with_standard_response
async def get_subscription(
    response: Response,
    request: Request,
    user_id: Annotated[str, Depends(get_current_user_uid)],
    subscription_id: Annotated[str, Path(description="Subscription Unique ID")],
):
    """Get a subscription by its ID."""
    store: SubscriptionStore = request.app.subscription_store
    subs = await store.get_subscriptions([subscription_id])
    if not subs:
        raise HTTPException(status_code=404, detail="Subscription not found")
    return {"subscription": subs[0].model_dump(exclude_none=True)}


@router.delete("/{subscription_id}/", include_in_schema=False)
@router.delete("/{subscription_id}")
@with_standard_response
async def delete_subscription(
    response: Response,
    request: Request,
    user_id: Annotated[str, Depends(get_current_user_uid)],
    subscription_id: Annotated[str, Path(description="Subscription Unique ID")],
    hard_delete: Annotated[bool, Query(description="Whether to hard delete the subscription")] = True,
):
    """Delete a subscription for the user."""
    store: SubscriptionStore = request.app.subscription_store
    await store.delete_subscription(subscription_id, hard_delete=hard_delete)
    return {"deleted": True}


@router.patch("/{subscription_id}/", include_in_schema=False)
@router.patch("/{subscription_id}")
@with_standard_response
async def update_subscription(
    response: Response,
    request: Request,
    user_id: Annotated[str, Depends(get_current_user_uid)],
    subscription_id: Annotated[str, Path(description="Subscription Unique ID")],
    body: Annotated[SubscriptionUpdateRequest, Body(description="Subscription update data")],
):
    """Update a subscription for the user."""
    store: SubscriptionStore = request.app.subscription_store
    await store.update_subscription(subscription_id, body.data)
    return {"updated": True}


@router.post("/{subscription_id}/newsfeeds/", include_in_schema=False)
@router.post("/{subscription_id}/newsfeeds")
@with_standard_response
async def create_newsfeed(
    response: Response,
    request: Request,
    user_id: Annotated[str, Depends(get_current_user_uid)],
    subscription_id: Annotated[str, Path(description="Subscription Unique ID")],
):
    """Create a new newsfeed for a subscription."""
    store: SubscriptionStore = request.app.subscription_store
    subs = await store.get_subscriptions([subscription_id])
    if not subs:
        raise HTTPException(status_code=404, detail="Subscription not found")
    newsfeed = await store.create_newsfeed(subs[0])
    return {"newsfeed": newsfeed.model_dump(exclude_none=True)}


@router.get("/{subscription_id}/newsfeeds/", include_in_schema=False)
@router.get("/{subscription_id}/newsfeeds")
@with_standard_response
async def list_newsfeeds(
    response: Response,
    request: Request,
    user_id: Annotated[str, Depends(get_current_user_uid)],
    subscription_id: Annotated[str, Path(description="Subscription Unique ID")],
):
    """List all newsfeeds for a subscription."""
    store: SubscriptionStore = request.app.subscription_store
    newsfeeds = await store.list_newsfeeds(subscription_id)
    return {"newsfeeds": [nf.model_dump(exclude_none=True, exclude={"content"}) for nf in newsfeeds]}


@router.get("/{subscription_id}/newsfeeds/{newsfeed_id}/", include_in_schema=False)
@router.get("/{subscription_id}/newsfeeds/{newsfeed_id}")
@with_standard_response
async def get_newsfeed(
    response: Response,
    request: Request,
    user_id: Annotated[str, Depends(get_current_user_uid)],
    subscription_id: Annotated[str, Path(description="Subscription Unique ID")],
    newsfeed_id: Annotated[str, Path(description="Newsfeed Unique ID")],
):
    """Get a newsfeed by its ID."""
    store: SubscriptionStore = request.app.subscription_store
    newsfeeds = await store.get_newsfeeds([newsfeed_id])
    if not newsfeeds:
        raise HTTPException(status_code=404, detail="Newsfeed not found")
    return {"newsfeed": newsfeeds[0].model_dump(exclude_none=True)}


@router.delete("/{subscription_id}/newsfeeds/{newsfeed_id}/", include_in_schema=False)
@router.delete("/{subscription_id}/newsfeeds/{newsfeed_id}")
@with_standard_response
async def delete_newsfeed(
    response: Response,
    request: Request,
    user_id: Annotated[str, Depends(get_current_user_uid)],
    subscription_id: Annotated[str, Path(description="Subscription Unique ID")],
    newsfeed_id: Annotated[str, Path(description="Newsfeed Unique ID")],
):
    """Delete a newsfeed by its ID."""
    store: SubscriptionStore = request.app.subscription_store
    await store.delete_newsfeed(newsfeed_id, hard_delete=True)
    return {"deleted": True}
