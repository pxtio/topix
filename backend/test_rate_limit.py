#!/usr/bin/env python3
"""Script to test the rate limiter on the hello-limited endpoint."""

import asyncio
import time
from typing import Any

import httpx


# Configuration
BASE_URL = "http://localhost:8888"  # Change this to your API base URL
EMAIL = "test@test.com"  # Change this to your test user email
PASSWORD = "test"  # Change this to your test user password


async def signup_or_signin(client: httpx.AsyncClient) -> str:
    """Sign up or sign in to get an access token."""
    # Try to sign in first
    print("Attempting to sign in...")
    signin_response = await client.post(
        f"{BASE_URL}/users/signin",
        data={"username": EMAIL, "password": PASSWORD},
    )

    if signin_response.status_code == 200:
        token_data = signin_response.json()
        print(f"✓ Signed in successfully")
        return token_data["data"]["token"]["access_token"]

    # If sign in fails, try to sign up
    print("Sign in failed, attempting to sign up...")
    signup_response = await client.post(
        f"{BASE_URL}/users/signup",
        json={"email": EMAIL, "password": PASSWORD},
    )

    if signup_response.status_code == 200:
        token_data = signup_response.json()
        print(f"✓ Signed up successfully")
        return token_data["access_token"]

    raise Exception(f"Failed to authenticate: {signup_response.text}")


async def test_endpoint(
    client: httpx.AsyncClient,
    endpoint: str,
    headers: dict[str, str],
    request_num: int
) -> dict[str, Any]:
    """Make a request to an endpoint and return the response details."""
    start_time = time.time()
    try:
        response = await client.get(f"{BASE_URL}{endpoint}", headers=headers)
        elapsed = time.time() - start_time

        return {
            "request_num": request_num,
            "status": response.status_code,
            "elapsed": elapsed,
            "body": response.json() if response.status_code in [200, 429] else response.text,
            "headers": dict(response.headers) if response.status_code == 429 else {},
        }
    except Exception as e:
        elapsed = time.time() - start_time
        return {
            "request_num": request_num,
            "status": "ERROR",
            "elapsed": elapsed,
            "body": str(e),
            "headers": {},
        }


async def test_rate_limit():
    """Test the rate limiter by making multiple requests."""
    async with httpx.AsyncClient() as client:
        # Authenticate
        print("=" * 60)
        print("AUTHENTICATION")
        print("=" * 60)
        access_token = await signup_or_signin(client)
        headers = {"Authorization": f"Bearer {access_token}"}
        print()

        # Test non-rate-limited endpoint
        print("=" * 60)
        print("TEST 1: Non-rate-limited endpoint (/hello)")
        print("=" * 60)
        print("Making 10 rapid requests to /hello...")
        print()

        for i in range(10):
            result = await test_endpoint(client, "/hello", headers, i + 1)
            if result["status"] == 200:
                print(f"Request {result['request_num']:2d}: ✓ {result['status']} - {result['elapsed']:.3f}s - User: {result['body'].get('user_id', 'N/A')[:8]}...")
            else:
                print(f"Request {result['request_num']:2d}: ✗ {result['status']} - {result['body']}")

        print()
        print("=" * 60)
        print("TEST 2: Rate-limited endpoint (/hello-limited)")
        print("=" * 60)
        print("Rate limit: 5 requests per 60 seconds")
        print("Making 10 rapid requests to /hello-limited...")
        print()

        # Test rate-limited endpoint
        for i in range(10):
            result = await test_endpoint(client, "/hello-limited", headers, i + 1)
            if result["status"] == 200:
                print(f"Request {result['request_num']:2d}: ✓ {result['status']} - {result['elapsed']:.3f}s - User: {result['body'].get('user_id', 'N/A')[:8]}...")
            elif result["status"] == 429:
                retry_after = result["headers"].get("retry-after", "N/A")
                print(f"Request {result['request_num']:2d}: ✗ 429 TOO MANY REQUESTS - Retry-After: {retry_after}s")
                print(f"              Message: {result['body'].get('detail', 'N/A')}")
            else:
                print(f"Request {result['request_num']:2d}: ✗ {result['status']} - {result['body']}")

        print()
        print("=" * 60)
        print("TEST 3: Wait and retry")
        print("=" * 60)
        print("Waiting 60 seconds for rate limit to reset...")

        for remaining in range(60, 0, -10):
            print(f"  {remaining} seconds remaining...", end="\r")
            await asyncio.sleep(10)
        print()

        print("Making 3 more requests after cooldown...")
        print()

        for i in range(3):
            result = await test_endpoint(client, "/hello-limited", headers, i + 1)
            if result["status"] == 200:
                print(f"Request {result['request_num']:2d}: ✓ {result['status']} - {result['elapsed']:.3f}s - User: {result['body'].get('user_id', 'N/A')[:8]}...")
            elif result["status"] == 429:
                retry_after = result["headers"].get("retry-after", "N/A")
                print(f"Request {result['request_num']:2d}: ✗ 429 TOO MANY REQUESTS - Retry-After: {retry_after}s")
            else:
                print(f"Request {result['request_num']:2d}: ✗ {result['status']} - {result['body']}")

        print()
        print("=" * 60)
        print("TESTS COMPLETE")
        print("=" * 60)


if __name__ == "__main__":
    print("\nRate Limit Test Script")
    print("=" * 60)
    print(f"Base URL: {BASE_URL}")
    print(f"Email: {EMAIL}")
    print("=" * 60)
    print()

    asyncio.run(test_rate_limit())
