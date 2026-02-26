"""User billing model definition."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

BillingPlan = Literal["free", "plus"]
BillingStatus = Literal["active", "trialing", "past_due", "canceled", "incomplete"]


class UserBilling(BaseModel):
    """Billing model representing a user's current plan and status."""

    user_uid: str
    plan: BillingPlan = "free"
    status: BillingStatus = "active"
    stripe_customer_id: str | None = None
    stripe_subscription_id: str | None = None
    current_period_start: datetime | None = None
    current_period_end: datetime | None = None
    cancel_at_period_end: bool = False

    created_at: datetime | None = Field(default_factory=datetime.now)
    updated_at: datetime | None = None
