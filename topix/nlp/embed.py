"""Embedding class."""

import asyncio
from openai import AsyncOpenAI

from topix.config.config import Config
from topix.utils.timeit import async_timeit


MODEL_NAME = "text-embedding-3-small"
DIMENSIONS = 1024


class OpenAIEmbedder:
    """A class to handle OpenAI embeddings using the OpenAI API."""

    def __init__(self, api_key: str | None = None):
        """Initialize the OpenAIEmbedder."""
        self._client = AsyncOpenAI(api_key=api_key)

    @classmethod
    def from_config(cls):
        """Create an instance of OpenAIEmbedder from configuration."""
        return cls(api_key=Config.instance().run.apis.openai.api_key)

    @async_timeit
    async def _embed_batch(self, texts: list[str]) -> list[list[float]]:
        # Call the embeddings endpoint asynchronously
        response = await self._client.embeddings.create(
            model="text-embedding-3-small",
            input=texts,
            dimensions=DIMENSIONS
        )
        # The embeddings are in response.data, ordered same as input
        return [e.embedding for e in response.data]

    async def embed(
        self,
        texts: list[str],
        batch_size: int = 1000
    ) -> list[list[float]]:
        """Embed a list of texts using OpenAI embeddings."""
        if not texts:
            return []

        tasks = []
        for i in range(0, len(texts), batch_size):
            batch = texts[i:i + batch_size]
            task = asyncio.create_task(self._embed_batch(batch))
            tasks.append(task)
        results = await asyncio.gather(*tasks)

        # Flatten the list of lists into a single list
        embeddings = [embedding for batch in results for embedding in batch]

        return embeddings
