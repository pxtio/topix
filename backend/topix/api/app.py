"""FastAPI application setup."""

import asyncio
import logging

from argparse import ArgumentParser
from contextlib import asynccontextmanager

import uvicorn

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from topix.api.router import boards, chats, files, finance, subscriptions, tools, users, utils
from topix.config.config import Config
from topix.datatypes.stage import StageEnum
from topix.nlp.pipeline.parsing import ParsingConfig, ParsingPipeline
from topix.setup import setup
from topix.store.chat import ChatStore
from topix.store.graph import GraphStore
from topix.store.qdrant.store import ContentStore
from topix.store.redis.store import RedisStore
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
        app.parser_pipeline = ParsingPipeline(config=ParsingConfig())

        # Initialize Redis
        app.redis_store = RedisStore.from_config()

        yield

        # Close stores
        await app.graph_store.close()
        await app.user_store.close()
        await app.chat_store.close()
        await app.subscription_store.close()
        # Close Redis
        await app.redis_store.close()

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

    return app


async def main(args) -> tuple[FastAPI, int]:
    """Run the application entry point."""
    await setup(stage=args.stage, env_filename=args.env_file)

    config: Config = Config.instance()

    app = create_app(stage=args.stage)

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
    args.add_argument(
        "--env-file",
        type=str,
        default=".env",
        help="Overridden name to the .env file to load. For example: .env.staging",
    )
    args = args.parse_args()

    app, port = asyncio.run(main(args))

    host = "0.0.0.0"
    logger.info(f"Starting Topix API on {host}:{port}...")

    uvicorn.run(app, host=host, port=port, log_level="info")
