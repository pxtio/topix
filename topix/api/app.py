"""FastAPI application setup."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from topix.api.router import boards, chats, tools
from topix.setup import setup
from topix.store.chat import ChatStore
from topix.store.graph import GraphStore
from topix.store.qdrant.store import ContentStore
from topix.store.user import UserStore


def create_app(**kwargs):
    """Create and configure the FastAPI application."""
    @asynccontextmanager
    async def lifespan(app: FastAPI):
        """Application lifespan context manager."""
        await setup(**kwargs)
        app.graph_store = GraphStore()
        await app.graph_store.open()
        app.user_store = UserStore()
        await app.user_store.open()
        app.chat_store = ChatStore()
        await app.chat_store.open()
        app.content_store = ContentStore()
        yield
        await app.graph_store.close()
        await app.user_store.close()
        await app.chat_store.close()
        await app.content_store.close()

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
