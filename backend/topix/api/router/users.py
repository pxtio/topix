"""Users API Router."""
import logging
from datetime import datetime, timedelta, timezone
from typing import Annotated

import bcrypt
import jwt
from fastapi import APIRouter, Depends, HTTPException, Path, Request, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel

from topix.datatypes.user import User
from topix.store.chat import ChatStore
from topix.store.user import UserStore

SECRET_KEY = "09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7" # Taken From fastapi page => to remove and include in secrets
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

router = APIRouter(
    prefix="/users",
    tags=["users"],
    responses={404: {"description": "Not found"}},
)

class Token(BaseModel):
    """Token model to store generated jwt token."""

    access_token: str
    token_type: str


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/users/signin")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Check that the plain password corresponds to hashed DB password."""
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def get_password_hash(password: str) -> str:
    """Hash a password."""
    password_bytes = password.encode('utf-8')
    hashed = bcrypt.hashpw(password_bytes, bcrypt.gensalt())
    hashed_str = hashed.decode('utf-8')
    return hashed_str

async def authenticate_user(user_store: UserStore, email: str, password: str) -> User | None:
    """Verify that the user exist and that the password corresponds to the email."""
    user = await user_store.get_user_by_email(email=email)
    if not user:
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user


def create_access_token(data: dict, expires_delta: timedelta | None = None):
    """Generate an access token with data encrypted."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


async def get_current_user_uid(request: Request, token: Annotated[str, Depends(oauth2_scheme)]) -> str:
    """Extract the user uid from the jwt token."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_uid = payload.get("sub")
        if user_uid is None:
            raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has no data",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.ExpiredSignatureError:
        # Token has expired
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidSignatureError:
        # Imvalid signature
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token signature",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as e:
        # Any other JWT error (bad signature, malformed token, etc.)
        logging.error("Problem when decoding token: " + str(e))
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user_uid


async def verify_chat_user(
    request: Request,
    current_user_uid: Annotated[str, Depends(get_current_user_uid)],
    chat_id: Annotated[str, Path(description="Chat ID")]
) -> None:
    """Verify that the chat belongs to the user in the jwt token."""
    chat_store: ChatStore = request.app.chat_store
    chat = await chat_store.get_chat(chat_id)
    if chat.user_uid != current_user_uid:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=" Permission error")


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
