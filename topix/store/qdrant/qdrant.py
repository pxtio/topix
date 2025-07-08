from typing import TypeVar, Sequence
from pydantic import BaseModel
from qdrant_client import AsyncQdrantClient
from qdrant_client.models import (
    Distance,
    VectorParams,
    PointStruct,
    Filter,
    ScoredPoint,
)

from topix.config.config import Config

T = TypeVar("T", bound=BaseModel)


class QdrantStore:
    def __init__(
        self,
        host: str = "localhost",
        port: int = 6333,
        https: bool = False,
        api_key: str | None = None,
    ):
        self.client = AsyncQdrantClient(
            host=host,
            port=port,
            https=https,
            api_key=api_key,
        )

    @classmethod
    async def from_config(cls):
        config = Config.get_instance()
        qdrant_config = config.run.databases.qdrant
        return cls(**qdrant_config.model_dump(exclude_none=True))

    async def create_collection(
        self,
        collection_name: str,
        vector_size: int,
        distance: Distance = Distance.COSINE,
        force_recreate: bool = False,
    ) -> None:
        exists = await self.client.collection_exists(collection_name)
        if force_recreate and exists:
            await self.client.delete_collection(collection_name)

        if force_recreate or not exists:
            await self.client.create_collection(
                collection_name=collection_name,
                vectors_config=VectorParams(size=vector_size, distance=distance),
            )

    async def add(
        self,
        collection_name: str,
        obj: T,
        embedding: list[float] | None = None,
    ) -> None:
        point_id = getattr(obj, "uid", getattr(obj, "id", None))
        if point_id is None:
            raise ValueError("Object must have a 'uid' or 'id' field.")

        point = PointStruct(
            id=point_id,
            payload=obj.dict(exclude_none=True),
            vector=embedding,
        )

        await self.client.upsert(collection_name=collection_name, points=[point])

    async def update_fields(
        self,
        collection_name: str,
        point_id: str | int,
        fields: dict,
    ) -> None:
        if not fields:
            raise ValueError("No fields provided to update.")

        await self.client.set_payload(
            collection_name=collection_name,
            payload=fields,
            points=[point_id],
        )

    async def delete(
        self,
        collection_name: str,
        point_id: str | int,
    ) -> None:
        await self.client.delete(
            collection_name=collection_name,
            points_selector={"points": [point_id]},
        )

    async def get(
        self,
        collection_name: str,
        point_id: str | int,
        include: dict | None = None,
        with_vector: bool = False,
    ) -> ScoredPoint | None:
        result = await self.client.retrieve(
            collection_name=collection_name,
            ids=[point_id],
            with_payload=include or False,
            with_vectors=with_vector,
        )
        return result[0] if result else None

    async def mget(
        self,
        collection_name: str,
        point_ids: Sequence[str | int],
        include: dict | None = None,
        with_vector: bool = False,
    ) -> list[ScoredPoint]:
        return await self.client.retrieve(
            collection_name=collection_name,
            ids=point_ids,
            with_payload=include or False,
            with_vectors=with_vector,
        )

    async def search(
        self,
        collection_name: str,
        embedding: list[float],
        limit: int = 5,
        filters: dict | Filter | None = None,
        include: dict | None = None,
    ) -> list[ScoredPoint]:
        return await self.client.search(
            collection_name=collection_name,
            query_vector=embedding,
            limit=limit,
            query_filter=filters,
            with_payload=include or False,
            with_vectors=True,
        )

    async def filter(
        self,
        collection_name: str,
        filter: dict | Filter,
        include: dict | None = None,
        order: list[dict] | None = None,
        limit: int = 1000,
    ) -> list[ScoredPoint]:
        results = []
        next_offset = None
        page_size = min(limit, 1000)

        while len(results) < limit:
            points, next_offset = await self.client.scroll(
                collection_name=collection_name,
                scroll_filter=filter,
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
        collection_name: str,
        filter: dict | Filter | None = None,
    ) -> int:
        result = await self.client.count(
            collection_name=collection_name,
            count_filter=filter,
            exact=True,
        )
        return result.count
