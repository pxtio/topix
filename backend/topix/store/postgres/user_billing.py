"""User billing Postgres store."""

from datetime import datetime

import asyncpg

from topix.datatypes.user_billing import UserBilling


async def create_user_billing(
    conn: asyncpg.Connection,
    billing: UserBilling
) -> UserBilling:
    """Create a new user billing record."""
    query = (
        "INSERT INTO user_billing ("
        "user_uid, plan, status, stripe_customer_id, stripe_subscription_id, "
        "current_period_start, current_period_end, cancel_at_period_end, created_at, updated_at"
        ") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)"
    )
    await conn.execute(
        query,
        billing.user_uid,
        billing.plan,
        billing.status,
        billing.stripe_customer_id,
        billing.stripe_subscription_id,
        billing.current_period_start,
        billing.current_period_end,
        billing.cancel_at_period_end,
        billing.created_at,
        billing.updated_at,
    )
    return billing


async def get_user_billing_by_uid(
    conn: asyncpg.Connection,
    user_uid: str
) -> UserBilling | None:
    """Fetch a user billing record by user UID."""
    query = (
        "SELECT user_uid, plan, status, stripe_customer_id, stripe_subscription_id, "
        "current_period_start, current_period_end, cancel_at_period_end, created_at, updated_at "
        "FROM user_billing WHERE user_uid = $1"
    )
    row = await conn.fetchrow(query, user_uid)
    if not row:
        return None
    return UserBilling(
        user_uid=row["user_uid"],
        plan=row["plan"],
        status=row["status"],
        stripe_customer_id=row["stripe_customer_id"],
        stripe_subscription_id=row["stripe_subscription_id"],
        current_period_start=row["current_period_start"].isoformat() if row["current_period_start"] else None,
        current_period_end=row["current_period_end"].isoformat() if row["current_period_end"] else None,
        cancel_at_period_end=row["cancel_at_period_end"],
        created_at=row["created_at"].isoformat() if row["created_at"] else None,
        updated_at=row["updated_at"].isoformat() if row["updated_at"] else None,
    )


async def update_user_billing_by_uid(
    conn: asyncpg.Connection,
    user_uid: str,
    updated_data: dict
):
    """Update user billing information by user UID."""
    forbidden_fields = {"user_uid", "created_at", "updated_at"}
    data = {k: v for k, v in updated_data.items() if k not in forbidden_fields}
    if not data:
        return

    set_clauses = [f"{k} = ${i + 1}" for i, k in enumerate(data.keys())]
    values = list(data.values())

    set_clauses.append(f"updated_at = ${len(values) + 1}")
    values.append(datetime.now())

    values.append(user_uid)
    query = f"UPDATE user_billing SET {', '.join(set_clauses)} WHERE user_uid = ${len(values)}"
    await conn.execute(query, *values)


async def upsert_user_billing_by_uid(
    conn: asyncpg.Connection,
    user_uid: str,
    data: dict
):
    """Upsert user billing data by user UID."""
    allowed_fields = {
        "plan",
        "status",
        "stripe_customer_id",
        "stripe_subscription_id",
        "current_period_start",
        "current_period_end",
        "cancel_at_period_end",
    }
    payload = {k: v for k, v in data.items() if k in allowed_fields}
    if not payload:
        return

    columns = ["user_uid", *payload.keys()]
    values = [user_uid, *payload.values()]
    placeholders = [f"${idx}" for idx in range(1, len(values) + 1)]

    update_assignments = ", ".join(
        [f"{key} = EXCLUDED.{key}" for key in payload.keys()] + ["updated_at = NOW()"]
    )

    query = (
        f"INSERT INTO user_billing ({', '.join(columns)}) "
        f"VALUES ({', '.join(placeholders)}) "
        f"ON CONFLICT (user_uid) DO UPDATE SET {update_assignments}"
    )
    await conn.execute(query, *values)


async def delete_user_billing_by_uid(
    conn: asyncpg.Connection,
    user_uid: str
):
    """Delete a user billing record by user UID."""
    query = "DELETE FROM user_billing WHERE user_uid = $1"
    await conn.execute(query, user_uid)
