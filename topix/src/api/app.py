"""FastAPI application setup."""

import asyncio

from argparse import ArgumentParser
from contextlib import asynccontextmanager

import uvicorn

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.api.router import boards, chats, tools
from src.config.config import Config
from src.datatypes.stage import StageEnum
from src.setup import setup
from src.store.chat import ChatStore
from src.store.graph import GraphStore
from src.store.user import UserStore
from src.utils.logging import logging_config

logging_config()


def create_app(stage: StageEnum):
    """Create and configure the FastAPI application."""
    @asynccontextmanager
    async def lifespan(app: FastAPI):
        """Application lifespan context manager."""
        app.graph_store = GraphStore()
        await app.graph_store.open()
        app.user_store = UserStore()
        await app.user_store.open()
        app.chat_store = ChatStore()
        await app.chat_store.open()
        yield
        await app.graph_store.close()
        await app.user_store.close()
        await app.chat_store.close()

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

    return app


async def main(args):
    """Run the application entry point."""
    await setup(stage=args.stage)
    app = create_app(stage=args.stage)

    config = Config.instance()
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
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")
