"""Integration tests for the user billing store."""

from datetime import datetime

import asyncpg
import pytest

from topix.datatypes.user import User
from topix.datatypes.user_billing import UserBilling
from topix.store.postgres.user import _dangerous_hard_delete_user_by_uid, create_user
from topix.store.postgres.user_billing import (
    create_user_billing,
    delete_user_billing_by_uid,
    get_user_billing_by_uid,
    update_user_billing_by_uid,
    upsert_user_billing_by_uid,
)
from topix.utils.common import gen_uid


@pytest.mark.asyncio
async def test_user_billing_crud(conn: asyncpg.Connection):
    """Test CRUD operations for user billing."""
    user_uid = gen_uid()
    user = User(
        uid=user_uid,
        email=f"{user_uid}@test.com",
        username=user_uid,
        name="Billing User",
        created_at=datetime.now().isoformat(),
        password_hash="hashed_password"
    )
    await create_user(conn, user)

    billing = UserBilling(
        user_uid=user_uid,
        plan="free",
        status="active",
    )

    try:
        # CREATE
        created = await create_user_billing(conn, billing)
        assert created.user_uid == user_uid
        assert created.plan == "free"
        assert created.status == "active"

        # GET
        loaded = await get_user_billing_by_uid(conn, user_uid)
        assert loaded is not None
        assert loaded.user_uid == user_uid
        assert loaded.plan == "free"
        assert loaded.status == "active"
        assert loaded.cancel_at_period_end is False

        # UPDATE
        period_end = datetime.now()
        await update_user_billing_by_uid(
            conn,
            user_uid,
            {
                "plan": "plus",
                "status": "trialing",
                "cancel_at_period_end": True,
                "current_period_end": period_end,
            }
        )
        updated = await get_user_billing_by_uid(conn, user_uid)
        assert updated is not None
        assert updated.plan == "plus"
        assert updated.status == "trialing"
        assert updated.cancel_at_period_end is True
        assert updated.current_period_end is not None
        assert updated.updated_at is not None

        # DELETE
        await delete_user_billing_by_uid(conn, user_uid)
        deleted = await get_user_billing_by_uid(conn, user_uid)
        assert deleted is None
    finally:
        await _dangerous_hard_delete_user_by_uid(conn, user_uid)


@pytest.mark.asyncio
async def test_user_billing_upsert_insert_then_update(conn: asyncpg.Connection):
    """Test upsert behavior for user billing."""
    user_uid = gen_uid()
    user = User(
        uid=user_uid,
        email=f"{user_uid}@test.com",
        username=user_uid,
        name="Billing Upsert User",
        created_at=datetime.now().isoformat(),
        password_hash="hashed_password"
    )
    await create_user(conn, user)

    try:
        # UPSERT INSERT
        period_start = datetime.now()
        period_end = datetime.now()
        await upsert_user_billing_by_uid(
            conn,
            user_uid,
            {
                "plan": "free",
                "status": "active",
                "current_period_start": period_start,
                "current_period_end": period_end,
            }
        )
        inserted = await get_user_billing_by_uid(conn, user_uid)
        assert inserted is not None
        assert inserted.plan == "free"
        assert inserted.status == "active"
        assert inserted.current_period_start is not None
        assert inserted.current_period_end is not None

        # UPSERT UPDATE
        await upsert_user_billing_by_uid(
            conn,
            user_uid,
            {
                "plan": "plus",
                "status": "active",
                "stripe_customer_id": f"cus_{gen_uid()}",
                "stripe_subscription_id": f"sub_{gen_uid()}",
                "cancel_at_period_end": False,
            }
        )
        updated = await get_user_billing_by_uid(conn, user_uid)
        assert updated is not None
        assert updated.plan == "plus"
        assert updated.status == "active"
        assert updated.stripe_customer_id is not None
        assert updated.stripe_subscription_id is not None
        assert updated.updated_at is not None
    finally:
        await delete_user_billing_by_uid(conn, user_uid)
        await _dangerous_hard_delete_user_by_uid(conn, user_uid)
