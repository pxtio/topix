"""FastAPI application setup."""

import asyncio
import logging

from argparse import ArgumentParser
from contextlib import asynccontextmanager

import uvicorn

from typing import Annotated

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from redis.asyncio import Redis

from topix.api.router import boards, chats, files, finance, subscriptions, tools, users, utils
from topix.api.utils.security import get_current_user_uid, rate_limiter
from topix.config.config import Config
from topix.datatypes.stage import StageEnum
from topix.setup import setup
from topix.store.chat import ChatStore
from topix.store.graph import GraphStore
from topix.store.subscription import SubscriptionStore
from topix.store.user import UserStore
from topix.utils.logging import logging_config

logging_config()
logger = logging.getLogger(__name__)


def create_app(stage: StageEnum):
    """Create and configure the FastAPI application."""
    @asynccontextmanager
    async def lifespan(app: FastAPI):
        """Application lifespan context manager."""
        # Initialize stores
        app.graph_store = GraphStore()
        await app.graph_store.open()
        app.user_store = UserStore()
        await app.user_store.open()
        app.chat_store = ChatStore()
        await app.chat_store.open()
        app.subscription_store = SubscriptionStore()
        await app.subscription_store.open()

        # Initialize Redis
        config: Config = Config.instance()
        redis_config = config.run.databases.redis
        app.redis = Redis(
            host=redis_config.host,
            port=redis_config.port,
            db=redis_config.db,
            password=redis_config.password.get_secret_value() if redis_config.password else None,
            decode_responses=True,
        )
        logger.info(f"Redis connected at {redis_config.host}:{redis_config.port}")

        yield

        # Close stores
        await app.graph_store.close()
        await app.user_store.close()
        await app.chat_store.close()
        await app.subscription_store.close()

        # Close Redis
        await app.redis.aclose()
        logger.info("Redis connection closed")

    app = FastAPI(lifespan=lifespan)

    origins = ["*"]

    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(boards.router)
    app.include_router(chats.router)
    app.include_router(tools.router)
    app.include_router(users.router)
    app.include_router(subscriptions.router)
    app.include_router(utils.router)
    app.include_router(finance.router)
    app.include_router(files.router)

    @app.get("/hello")
    async def hello_world(user_id: Annotated[str, Depends(get_current_user_uid)]):
        """Hello world endpoint without rate limiting."""
        return {"message": "Hello World!", "user_id": user_id}

    @app.get("/hello-limited")
    async def hello_world_limited(
        user_id: Annotated[str, Depends(get_current_user_uid)],
        _: Annotated[None, Depends(rate_limiter)]
    ):
        """Hello world endpoint with rate limiting (5 requests per minute)."""
        return {"message": "Hello World! (Rate Limited)", "user_id": user_id}

    return app


async def main(args) -> tuple[FastAPI, int]:
    """Run the application entry point."""
    await setup(stage=args.stage)
    app = create_app(stage=args.stage)

    config: Config = Config.instance()
    return app, args.port or config.app.settings.port


if __name__ == "__main__":
    args = ArgumentParser(description="Run the Topix application.")
    args.add_argument(
        "--stage",
        default=StageEnum.LOCAL,
        help="The stage to run the application in.",
        choices=list(StageEnum)
    )
    args.add_argument(
        "--port",
        type=int,
        default=None,
        help="Port to run the application on."
    )
    args = args.parse_args()

    app, port = asyncio.run(main(args))

    host = "0.0.0.0"
    logger.info(f"Starting Topix API on {host}:{port}...")

    uvicorn.run(app, host=host, port=port, log_level="info")
