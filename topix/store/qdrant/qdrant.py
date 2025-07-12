"""QdrantStore class for managing a Qdrant database."""

import logging
from typing import TypeVar, Sequence

from pydantic import BaseModel
from qdrant_client import AsyncQdrantClient
from qdrant_client.models import (
    Distance,
    VectorParams,
    PointStruct,
    Filter,
    ScalarQuantization,
    ScalarQuantizationConfig,
    ScoredPoint
)

from topix.config.config import Config
from topix.utils.timeit import async_timeit

logger = logging.getLogger(__name__)

T = TypeVar("T", bound=BaseModel)


class QdrantStore:
    """QdrantStore class for managing a Qdrant database."""

    def __init__(
        self,
        host: str = "localhost",
        port: int = 6333,
        https: bool = False,
        api_key: str | None = None,
        collection: str = "topix"
    ):
        """Init method."""
        self.client = AsyncQdrantClient(
            host=host,
            port=port,
            https=https,
            api_key=api_key,
        )
        self.collection = collection

    @classmethod
    def from_config(cls):
        """Create a QdrantStore instance from the application configuration."""
        config = Config.instance()
        qdrant_config = config.run.databases.qdrant
        return cls(**qdrant_config.model_dump(exclude_none=True))

    async def create_collection(
        self,
        vector_size: int,
        distance: Distance = Distance.COSINE,
        force_recreate: bool = False,
        quantized: bool = True
    ) -> None:
        """Create a Qdrant collection with the specified parameters."""
        exists = await self.client.collection_exists(self.collection)
        if force_recreate and exists:
            await self.client.delete_collection(self.collection)

        if force_recreate or not exists:
            await self.client.create_collection(
                collection_name=self.collection,
                vectors_config=VectorParams(size=vector_size, distance=distance),
                quantization_config=ScalarQuantization(
                    scalar=ScalarQuantizationConfig(
                        type="int8",
                        quantile=0.99,
                        always_ram=True
                    )
                ) if quantized else None,
            )

    async def drop_collection(self) -> None:
        """Drop the Qdrant collection if it exists."""
        exists = await self.client.collection_exists(self.collection)
        if exists:
            await self.client.delete_collection(self.collection)
            logger.info(f"Collection '{self.collection}' dropped.")
        else:
            logger.warning(f"Collection '{self.collection}' does not exist.")

    async def _add_batch(
        self,
        objects: Sequence[T],
        embeddings: Sequence[list[float] | None] | None = None,
    ) -> None:
        """Add a batch of objects to the Qdrant collection."""
        if not objects:
            raise ValueError("No objects provided to add.")

        points = []
        for i, obj in enumerate(objects):
            point_id = getattr(obj, "uid", getattr(obj, "id", None))
            if point_id is None:
                raise ValueError("Object must have a 'uid' or 'id' field.")
            vector = embeddings[i] if embeddings else None
            points.append(PointStruct(
                id=point_id,
                payload=obj.model_dump(exclude_none=True),
                vector=vector
            ))

        await self.client.upsert(collection_name=self.collection, points=points)

    @async_timeit
    async def add(
        self,
        objects: Sequence[T],
        embeddings: Sequence[list[float] | None] | None = None,
        batch_size: int = 1000
    ) -> None:
        """Add a batch of objects to the Qdrant collection."""
        if not objects:
            raise ValueError("No objects provided to add.")

        for i in range(0, len(objects), batch_size):
            batch = objects[i:i + batch_size]
            batch_embeddings = embeddings[i:i + batch_size] if embeddings else None
            logger.info(f"Adding batch {i // batch_size + 1} of size {len(batch)}")
            await self._add_batch(batch, batch_embeddings)

    async def update_fields(
        self,
        point_id: str | int,
        fields: dict,
    ) -> None:
        """Update specific fields of a point in the collection."""
        if not fields:
            raise ValueError("No fields provided to update.")

        await self.client.set_payload(
            collection_name=self.collection,
            payload=fields,
            points=[point_id],
        )

    async def delete(
        self,
        point_id: str | int,
    ) -> None:
        """Delete a point from the collection by its ID."""
        await self.client.delete(
            collection_name=self.collection,
            points_selector={"points": [point_id]},
        )

    async def get(
        self,
        point_id: str | int,
        include: dict | None = None,
        with_vector: bool = False,
    ) -> ScoredPoint | None:
        """Retrieve a point from the collection by its ID."""
        result = await self.client.retrieve(
            collection_name=self.collection,
            ids=[point_id],
            with_payload=include or False,
            with_vectors=with_vector,
        )
        return result[0] if result else None

    async def mget(
        self,
        point_ids: Sequence[str | int],
        include: dict | None = None,
        with_vector: bool = False,
    ) -> list[ScoredPoint]:
        """Retrieve multiple points from the collection by their IDs."""
        return await self.client.retrieve(
            collection_name=self.collection,
            ids=point_ids,
            with_payload=include or False,
            with_vectors=with_vector,
        )

    async def search(
        self,
        embedding: list[float],
        limit: int = 5,
        filters: dict | Filter | None = None,
        include: dict | None = None,
        with_vector: bool = False,
    ) -> list[ScoredPoint]:
        """Search for points in the collection based on the given embedding."""
        return await self.client.search(
            collection_name=self.collection,
            query_vector=embedding,
            limit=limit,
            query_filter=filters,
            with_payload=include or False,
            with_vectors=with_vector,
        )

    @async_timeit
    async def filt(
        self,
        filters: dict | Filter,
        include: dict | None = None,
        order: list[dict] | None = None,
        limit: int = 1000,
    ) -> list[ScoredPoint]:
        """Filter points in the collection based on the given filters."""
        results = []
        next_offset = None
        page_size = min(limit, 1000)

        while len(results) < limit:
            points, next_offset = await self.client.scroll(
                collection_name=self.collection,
                scroll_filter=filters,
                limit=page_size,
                offset=next_offset,
                with_payload=include or False,
                with_vectors=False,
                order_by=order,
            )
            results.extend(points)
            if not points or next_offset is None:
                break

        return results[:limit]

    async def count(
        self,
        filters: dict | Filter | None = None,
    ) -> int:
        """Count the number of points in the collection that match the given filters."""
        result = await self.client.count(
            collection_name=self.collection,
            count_filter=filters,
            exact=True,
        )
        return result.count
