"""Users API Router."""
import logging
from datetime import timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm

from topix.api.utils.security import ACCESS_TOKEN_EXPIRE_MINUTES, create_access_token, get_password_hash, Token, authenticate_user
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
    user: User,
) -> Token:
    """Create a user in postgres database."""
    user_store: UserStore = request.app.user_store
    new_value = get_password_hash(user.password_hash)
    user.password_hash = new_value
    try:
        await user_store.add_user(user)
    except Exception as e:
        logging.info(e)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Error when creating user",
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.uid}, expires_delta=access_token_expires
    )
    return Token(access_token=access_token, token_type="bearer")
