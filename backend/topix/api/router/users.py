"""Users API Router."""
import logging

from datetime import timedelta
from typing import Annotated

from fastapi import APIRouter, Body, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm

from topix.api.datatypes.requests import RefreshRequest, UserSignupRequest
from topix.api.helpers import with_standard_response
from topix.api.utils.security import (
    ACCESS_TOKEN_EXPIRE_MINUTES,
    REFRESH_TOKEN_EXPIRE_DAYS,
    Token,
    authenticate_user,
    create_access_token,
    create_refresh_token,
    decode_and_validate_token,
    get_current_user_uid,
    get_password_hash,
)
from topix.datatypes.user import User
from topix.store.user import UserStore

router = APIRouter(
    prefix="/users",
    tags=["users"],
    responses={404: {"description": "Not found"}},
)


ROTATE_REFRESH_TOKENS = True  # set False if you prefer not to rotate


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

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={
            "sub": user.uid,
            "email": user.email,
            "name": user.name,
            "username": user.username,
        },
        expires_delta=access_token_expires,
    )
    refresh_token = create_refresh_token(
        data={"sub": user.uid},
        expires_delta=timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
    )
    return {
        "token": Token(
            access_token=access_token,
            token_type="bearer",
            refresh_token=refresh_token
        ).model_dump(exclude_none=True)
    }


@router.post("/signup")
@with_standard_response
async def create_user(
    request: Request,
    body: Annotated[UserSignupRequest, Body(description="User signup data")],
):
    """Create a user in postgres database."""
    user_store: UserStore = request.app.user_store
    pw_hash = get_password_hash(body.password)
    new_user = User(
        email=body.email,
        password_hash=pw_hash,
        name=body.name,
        username=body.username,
    )
    try:
        await user_store.add_user(new_user)
    except Exception as e:
        logging.info(e)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Error when creating user",
        )

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={
            "sub": new_user.uid,
            "email": new_user.email,
            "name": new_user.name,
            "username": new_user.username,
        },
        expires_delta=access_token_expires,
    )
    refresh_token = create_refresh_token(
        data={"sub": new_user.uid},
        expires_delta=timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
    )
    return {
        "token": Token(
            access_token=access_token,
            token_type="bearer",
            refresh_token=refresh_token
        ).model_dump(exclude_none=True)
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
