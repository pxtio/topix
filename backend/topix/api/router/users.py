"""Users API Router."""
import logging
import os

from datetime import timedelta
from typing import Annotated

from fastapi import APIRouter, Body, Depends, HTTPException, Request, status
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token

from topix.api.datatypes.requests import GoogleSigninRequest, RefreshRequest
from topix.api.utils.decorators import with_standard_response
from topix.api.utils.security import (
    ACCESS_TOKEN_EXPIRE_MINUTES,
    REFRESH_TOKEN_EXPIRE_DAYS,
    Token,
    create_access_token,
    create_refresh_token,
    decode_and_validate_token,
    get_current_user_uid,
)
from topix.datatypes.user import User
from topix.store.user import UserStore

router = APIRouter(
    prefix="/users",
    tags=["users"],
    responses={404: {"description": "Not found"}},
)


ROTATE_REFRESH_TOKENS = True  # set False if you prefer not to rotate


def _issue_tokens(user: User) -> dict:
    """Issue access and refresh JWT tokens for a user."""
    access_token = create_access_token(
        data={
            "sub": user.uid,
            "email": user.email,
            "name": user.name,
            "username": user.username,
        },
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    refresh_token = create_refresh_token(
        data={"sub": user.uid},
        expires_delta=timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
    )
    return {
        "token": Token(
            access_token=access_token,
            token_type="bearer",
            refresh_token=refresh_token,
        ).model_dump(exclude_none=True)
    }


@router.post("/google-signin")
@with_standard_response
async def google_signin(
    request: Request,
    body: Annotated[GoogleSigninRequest, Body(description="Google OAuth ID token")],
):
    """Verify a Google ID token and return JWT tokens.

    If the user does not exist yet, a new account is created automatically.
    """
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    if not client_id:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Google OAuth is not configured",
        )

    try:
        idinfo = google_id_token.verify_oauth2_token(
            body.id_token, google_requests.Request(), client_id
        )
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Google ID token",
        )

    email = idinfo.get("email")
    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Google token does not contain an email",
        )

    user_store: UserStore = request.app.user_store
    user = await user_store.get_user_by_email(email)

    if not user:
        # Auto-create user on first Google sign-in
        username = email.split("@")[0]
        name = idinfo.get("name") or username
        new_user = User(email=email, username=username, name=name)
        try:
            await user_store.add_user(new_user)
        except Exception as e:
            logging.error(f"Error creating user from Google sign-in: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Error when creating user",
            )
        user = new_user

    return _issue_tokens(user)


@router.post("/refresh")
@with_standard_response
async def refresh_access_token(
    request: Request,
    body: Annotated[RefreshRequest, Body(description="Refresh token payload")],
):
    """Exchange a valid refresh token for a new access token.

    Optionally rotate refresh token.
    """
    # 1) Validate refresh token (type + exp + signature)
    payload = decode_and_validate_token(body.refresh_token, expected_type="refresh")
    user_uid = payload.get("sub")
    if not user_uid:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    # (optional) Check the user still exists / active
    user_store: UserStore = request.app.user_store
    user = await user_store.get_user(user_uid)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive")

    # 2) Issue new access token (short-lived)
    access_token = create_access_token(
        data={
            "sub": user.uid,
            "email": user.email,
            "name": user.name,
            "username": user.username,
        },
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )

    # 3) Optionally rotate refresh token (recommended)
    new_refresh = None
    if ROTATE_REFRESH_TOKENS:
        new_refresh = create_refresh_token(
            data={"sub": user.uid},
            expires_delta=timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
        )

    return {
        "token": Token(
            access_token=access_token,
            token_type="bearer",
            refresh_token=new_refresh
        ).model_dump(exclude_none=True)
    }


@router.delete("/")
@with_standard_response
async def delete_user(
    request: Request,
    user_id: Annotated[str, Depends(get_current_user_uid)],
):
    """Delete a user by its ID."""
    user_store: UserStore = request.app.user_store
    return await user_store.delete_user(user_id, hard_delete=True)
