"""Minimal Stripe API client for billing primitives."""

import httpx


class StripeApiError(Exception):
    """Raised when Stripe returns a non-success response."""

    def __init__(self, message: str, status_code: int, payload: dict | None = None):
        """Initialize Stripe API error details."""
        super().__init__(message)
        self.status_code = status_code
        self.payload = payload or {}


class StripeClient:
    """Thin wrapper over Stripe REST API endpoints."""

    def __init__(self, secret_key: str):
        """Initialize client with Stripe API secret key."""
        self._secret_key = secret_key
        self._base_url = "https://api.stripe.com/v1"

    async def _post(self, path: str, data: dict) -> dict:
        headers = {"Authorization": f"Bearer {self._secret_key}"}
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.post(
                f"{self._base_url}{path}",
                headers=headers,
                data=data,
            )

        if response.content:
            try:
                payload = response.json()
            except ValueError:
                payload = {"raw": response.text}
        else:
            payload = {}
        if response.status_code >= 400:
            message = payload.get("error", {}).get("message", "Stripe request failed")
            raise StripeApiError(message=message, status_code=response.status_code, payload=payload)
        return payload

    async def create_customer(
        self,
        *,
        email: str,
        name: str | None,
        user_uid: str,
    ) -> dict:
        """Create a Stripe customer."""
        data = {
            "email": email,
            "metadata[user_uid]": user_uid,
        }
        if name:
            data["name"] = name
        return await self._post("/customers", data=data)

    async def create_checkout_session(
        self,
        *,
        customer_id: str,
        price_id: str,
        success_url: str,
        cancel_url: str,
        user_uid: str,
    ) -> dict:
        """Create a Stripe checkout session for plus monthly plan."""
        data = {
            "mode": "subscription",
            "customer": customer_id,
            "line_items[0][price]": price_id,
            "line_items[0][quantity]": "1",
            "success_url": success_url,
            "cancel_url": cancel_url,
            "client_reference_id": user_uid,
            "metadata[user_uid]": user_uid,
            "subscription_data[metadata][user_uid]": user_uid,
            "allow_promotion_codes": "true",
        }
        return await self._post("/checkout/sessions", data=data)

    async def create_billing_portal_session(self, *, customer_id: str, return_url: str) -> dict:
        """Create a Stripe billing portal session."""
        data = {
            "customer": customer_id,
            "return_url": return_url,
        }
        return await self._post("/billing_portal/sessions", data=data)
