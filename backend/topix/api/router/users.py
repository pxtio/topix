"""Users API Router."""
import logging

from datetime import timedelta
from typing import Annotated

from fastapi import APIRouter, Body, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm

from topix.api.datatypes.requests import UserSignupRequest
from topix.api.helpers import with_standard_response
from topix.api.utils.security import (
    ACCESS_TOKEN_EXPIRE_MINUTES,
    Token,
    authenticate_user,
    create_access_token,
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


@router.post("/signin")
async def login_for_access_token(
    request: Request,
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
) -> Token:
    """Signin for the user and return a jwt token."""
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
        data={"sub": user.uid}, expires_delta=access_token_expires
    )
    return Token(access_token=access_token, token_type="bearer")


@router.post("/signup")
async def create_user(
    request: Request,
    body: Annotated[UserSignupRequest, Body(description="User signup data")],
) -> Token:
    """Create a user in postgres database."""
    user_store: UserStore = request.app.user_store
    pw_hash = get_password_hash(body.password)
    new_user = User(
        email=body.email,
        password_hash=pw_hash,
        name=body.name,
        username=body.username
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
            "username": new_user.username
        },
        expires_delta=access_token_expires
    )
    return Token(access_token=access_token, token_type="bearer")


@router.get("/me")
@with_standard_response
async def read_users_me(
    request: Request,
    current_user_uid: Annotated[str, Depends(get_current_user_uid)],
):
    """Get current user info."""
    user_store: UserStore = request.app.user_store
    user = await user_store.get_user(current_user_uid)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user.model_dump(exclude={"password_hash", "id"}, exclude_none=True)
