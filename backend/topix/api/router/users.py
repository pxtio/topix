"""Users API Router."""
import logging
import os

import bcrypt

from datetime import timedelta
from typing import Annotated

from fastapi import APIRouter, Body, Depends, HTTPException, Request, Response, status
from fastapi.security import OAuth2PasswordRequestForm
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token

from topix.api.datatypes.requests import EmailVerificationRequest, GoogleSigninRequest, RefreshRequest, UserSignupRequest
from topix.api.utils.decorators import with_standard_response
from topix.api.utils.email_verification import (
    DEFAULT_RESEND_COOLDOWN_SECONDS,
    build_email_verification_url,
    compute_verification_expiry,
    generate_email_verification_token,
    get_email_verification_config,
    hash_email_verification_token,
    is_email_verification_enabled,
    send_email_verification_link,
    utc_now,
)
from topix.api.utils.rate_limit.token_plan import resolve_plan_for_token
from topix.api.utils.security import (
    ACCESS_TOKEN_EXPIRE_MINUTES,
    REFRESH_TOKEN_EXPIRE_DAYS,
    Token,
    create_access_token,
    create_refresh_token,
    decode_and_validate_token,
    get_current_user_uid,
)
from topix.datatypes.email_verification import EmailVerificationToken
from topix.datatypes.user import User
from topix.store.email_verification import EmailVerificationStore
from topix.store.user import UserStore

router = APIRouter(
    prefix="/users",
    tags=["users"],
    responses={404: {"description": "Not found"}},
)


ROTATE_REFRESH_TOKENS = True  # set False if you prefer not to rotate


async def _issue_tokens(request: Request, user: User) -> dict:
    """Issue access and refresh JWT tokens for a user."""
    plan = await resolve_plan_for_token(request, user.uid)
    access_token = create_access_token(
        data={
            "sub": user.uid,
            "email": user.email,
            "name": user.name,
            "username": user.username,
            "plan": plan,
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


async def authenticate_user(user_store: UserStore, email: str, password: str) -> User | None:
    """Verify email/password credentials and return the user or None."""
    user = await user_store.get_user_by_email(email)
    if not user or not user.password_hash:
        return None
    if not bcrypt.checkpw(password.encode(), user.password_hash.encode()):
        return None
    return user


@router.post("/signin")
@with_standard_response
async def login_for_access_token(
    request: Request,
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
):
    """Signin for the user and return tokens."""
    user_store: UserStore = request.app.user_store
    user = await authenticate_user(user_store, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return await _issue_tokens(request, user)


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

    return await _issue_tokens(request, user)


@router.post("/signup")
@with_standard_response
async def signup(
    request: Request,
    body: Annotated[UserSignupRequest, Body(description="User signup payload")],
):
    """Create a new user account with email/password."""
    user_store: UserStore = request.app.user_store

    password_hash = bcrypt.hashpw(body.password.encode(), bcrypt.gensalt()).decode()
    new_user = User(
        email=body.email,
        username=body.username,
        name=body.name,
        password_hash=password_hash,
    )
    try:
        await user_store.add_user(new_user)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    if is_email_verification_enabled():
        email_verification_store: EmailVerificationStore = request.app.email_verification_store
        verification_config = get_email_verification_config()
        raw_token = generate_email_verification_token()
        token_hash = hash_email_verification_token(raw_token)
        now = utc_now()
        await email_verification_store.save_token(
            EmailVerificationToken(
                user_uid=new_user.uid,
                token_hash=token_hash,
                expires_at=compute_verification_expiry(now, verification_config.ttl_hours),
                created_at=now,
            )
        )
        verification_url = build_email_verification_url(verification_config.app_base_url, raw_token)
        try:
            await send_email_verification_link(
                resend_api_key=verification_config.resend_api_key,
                resend_from_email=verification_config.resend_from_email,
                to_email=new_user.email,
                verification_url=verification_url,
                ttl_hours=verification_config.ttl_hours,
            )
        except HTTPException:
            logging.exception("Failed to send verification email on signup for user %s", new_user.uid)

    return await _issue_tokens(request, new_user)


@router.post("/verify-email")
@with_standard_response
async def verify_email(
    response: Response,
    request: Request,
    body: Annotated[EmailVerificationRequest, Body(description="Email verification token payload")],
):
    """Verify user email from a verification token."""
    if not is_email_verification_enabled():
        return {"message": "Email verification is disabled"}

    email_verification_store: EmailVerificationStore = request.app.email_verification_store
    user_store: UserStore = request.app.user_store

    token_hash = hash_email_verification_token(body.token)
    token = await email_verification_store.get_active_token_by_hash(token_hash)
    if token is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification token",
        )

    await user_store.mark_user_email_verified(token.user_uid)
    await email_verification_store.mark_token_used(token.uid)
    return {"message": "Email verified successfully"}


@router.post("/resend-verification")
@with_standard_response
async def resend_verification_email(
    response: Response,
    request: Request,
    user_id: Annotated[str, Depends(get_current_user_uid)],
):
    """Resend verification email to the current user."""
    if not is_email_verification_enabled():
        return {"message": "Email verification is disabled"}

    user_store: UserStore = request.app.user_store
    email_verification_store: EmailVerificationStore = request.app.email_verification_store
    verification_config = get_email_verification_config()

    user = await user_store.get_user(user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if user.email_verified_at is not None:
        return {"message": "Email already verified"}

    latest_token = await email_verification_store.get_latest_token_for_user(user.uid)
    now = utc_now()
    if latest_token and latest_token.created_at:
        elapsed = (now - latest_token.created_at).total_seconds()
        if elapsed < DEFAULT_RESEND_COOLDOWN_SECONDS:
            retry_after = max(1, int(DEFAULT_RESEND_COOLDOWN_SECONDS - elapsed))
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Please wait before requesting another verification email",
                headers={"Retry-After": str(retry_after)},
            )

    raw_token = generate_email_verification_token()
    token_hash = hash_email_verification_token(raw_token)
    await email_verification_store.save_token(
        EmailVerificationToken(
            user_uid=user.uid,
            token_hash=token_hash,
            expires_at=compute_verification_expiry(now, verification_config.ttl_hours),
            created_at=now,
        )
    )
    verification_url = build_email_verification_url(verification_config.app_base_url, raw_token)
    await send_email_verification_link(
        resend_api_key=verification_config.resend_api_key,
        resend_from_email=verification_config.resend_from_email,
        to_email=user.email,
        verification_url=verification_url,
        ttl_hours=verification_config.ttl_hours,
    )
    return {"message": "Verification email sent"}


@router.get("/email-verification-status")
@with_standard_response
async def get_email_verification_status(
    response: Response,
    request: Request,
    user_id: Annotated[str, Depends(get_current_user_uid)],
):
    """Return whether verification is enabled and whether current user is verified."""
    enabled = is_email_verification_enabled()
    if not enabled:
        return {"enabled": False, "verified": True}

    user_store: UserStore = request.app.user_store
    user = await user_store.get_user(user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    return {
        "enabled": True,
        "verified": user.email_verified_at is not None,
    }


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
    plan = await resolve_plan_for_token(request, user.uid)
    access_token = create_access_token(
        data={
            "sub": user.uid,
            "email": user.email,
            "name": user.name,
            "username": user.username,
            "plan": plan,
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
