"""ContentStore for managing notes and messages in Qdrant."""

import logging

from qdrant_client import AsyncQdrantClient
from qdrant_client.models import (
    Distance,
    Filter,
    FilterSelector,
    MultiVectorComparator,
    MultiVectorConfig,
    OrderBy,
    PointIdsList,
    PointStruct,
    QueryRequest,
    ScalarQuantization,
    ScalarQuantizationConfig,
    VectorParams,
)

from topix.config.config import Config
from topix.datatypes.chat.chat import Message
from topix.datatypes.note.link import Link
from topix.datatypes.note.note import Note
from topix.datatypes.note.property import TextProperty
from topix.nlp.embed import DIMENSIONS, OpenAIEmbedder
from topix.store.qdrant.utils import convert_point_to_entry, payload_dict_to_field_list

logger = logging.getLogger(__name__)

type Entry = Note | Link | Message

DEFAULT_COLLECTION = "topix"

INDEX_FIELDS = [
    ("created_at", "datetime"),
    ("updated_at", "datetime"),
    ("deleted_at", "datetime"),
    ("type", "keyword"),
    # message
    ("chat_uid", "keyword"),
    # note
    ("graph_uid", "keyword"),
    # link
    ("graph_uid", "keyword"),
]


class QdrantStore:
    """Manager for handling data in the Qdrant store."""

    def __init__(
        self,
        qdrant_client: AsyncQdrantClient,
        embedder: OpenAIEmbedder,
        collection: str = DEFAULT_COLLECTION,
    ):
        """Init method."""
        self.client = qdrant_client
        self.embedder = embedder
        self.collection = collection

    @classmethod
    def from_config(cls):
        """Create an instance of QdrantStore from configuration."""
        config: Config = Config.instance()
        qdrant_config = config.run.databases.qdrant
        qdrant_client = AsyncQdrantClient(**qdrant_config.model_dump(exclude_none=True))
        embedder = OpenAIEmbedder.from_config()

        return cls(qdrant_client=qdrant_client, embedder=embedder)

    async def create_collection(
        self,
        vector_size: int = DIMENSIONS,
        distance: Distance = Distance.COSINE,
        force_recreate: bool = False,
        quantized: bool = True,
    ) -> None:
        """Create a Qdrant collection with the specified parameters.

        Supporting multiple vector storage
        """
        exists = await self.client.collection_exists(self.collection)
        if force_recreate and exists:
            await self.client.delete_collection(self.collection)

        if force_recreate or not exists:
            await self.client.create_collection(
                collection_name=self.collection,
                vectors_config=VectorParams(
                    size=vector_size,
                    distance=distance,
                    multivector_config=MultiVectorConfig(
                        comparator=MultiVectorComparator.MAX_SIM
                    ),
                ),
                quantization_config=ScalarQuantization(
                    scalar=ScalarQuantizationConfig(
                        type="int8", quantile=0.99, always_ram=True
                    )
                )
                if quantized
                else None,
            )
            for field_name, field_type in INDEX_FIELDS:
                await self.client.create_payload_index(
                    collection_name=self.collection,
                    field_name=field_name,
                    field_type=field_type,
                )

    async def drop_collection(self) -> None:
        """Drop the Qdrant collection if it exists."""
        exists = await self.client.collection_exists(self.collection)
        if exists:
            await self.client.delete_collection(self.collection)
            logger.info(f"Collection '{self.collection}' dropped.")
        else:
            logger.warning(f"Collection '{self.collection}' does not exist.")

    async def get(
        self,
        ids: list[str | int],
        include: dict | bool = True,
        with_vector: bool = False,
    ) -> list[Entry]:
        """Retrieve multiple Entry objects by their IDs."""
        if isinstance(include, dict):
            include = payload_dict_to_field_list(include)
        points = await self.client.retrieve(
            collection_name=self.collection,
            point_ids=ids,
            with_payload=include,
            with_vector=with_vector,
        )
        return [convert_point_to_entry(point) for point in points]

    async def delete(self, ids: list[str | int], refresh: bool = False) -> None:
        """Delete multiple Entry objects by their IDs."""
        await self.client.delete(
            collection_name=self.collection,
            points_selector=PointIdsList(point_ids=ids),
            wait=refresh,
        )
        logger.info(f"Successfully deleted {len(ids)} data from the collection.")

    async def delete_by_condition(
        self, condition: Filter, refresh: bool = False
    ) -> None:
        """Delete Entry objects based on a filter condition."""
        await self.client.delete(
            collection_name=self.collection,
            points_selector=FilterSelector(filter=condition),
            wait=refresh,
        )
        logger.info("Successfully deleted.")

    async def count(self, filter: Filter | None = None) -> int:
        """Count the number of objects in the collection."""
        res = await self.client.count(
            collection_name=self.collection,
            count_filter=filter,
        )
        return res.count

    async def _embed(self, entries: list[Entry]) -> list[list[list[float]] | None]:
        searchable_texts = []
        indices = []
        for i, entry in enumerate(entries):
            for prop in entry.properties.values():
                if isinstance(prop, TextProperty):
                    if prop.searchable and prop.text:
                        searchable_texts.append(prop.text)
                        indices.append(i)
        embeds = await self.embedder.embed(searchable_texts)
        # Create a list of embeddings with the same length as entries
        embeddings = [None] * len(entries)
        for i, idx in enumerate(indices):
            if embeds[i] is None:
                embeddings[idx] = [embeds[i]]
            else:
                embeddings[idx].append(embeds[i])
        return embeddings

    async def add(
        self,
        entries: list[Entry],
        refresh: bool = False,
        batch_size: int = 1000,
    ):
        """Create a new note in the Qdrant store."""
        embeddings = await self._embed(entries)
        for i in range(0, len(entries), batch_size):
            batch_entries = entries[i:i + batch_size]
            batch_embeddings = embeddings[i:i + batch_size]

            points = [
                PointStruct(
                    id=entry.id,
                    vector=embedding,
                    payload=entry.model_dump(exclude_none=True),
                )
                for entry, embedding in zip(batch_entries, batch_embeddings)
            ]
            if points:
                await self.client.upsert(
                    collection_name=self.collection,
                    points=points,
                    wait=refresh,
                )
        logger.info(f"Added {len(entries)} data to the Qdrant store.")

    async def search(
        self,
        query: str,
        limit: int = 5,
        filter: Filter | None = None,
        include: dict | bool = True,
        with_vector: bool = False,
        offset: int | None = None,
    ) -> list[Entry]:
        """Semantic Search for text query."""
        query_vector = await self.embedder.embed([query])[0]
        if isinstance(include, dict):
            include = payload_dict_to_field_list(include)
        results = await self.client.query_points(
            collection_name=self.collection,
            query=query_vector,
            query_filter=filter,
            limit=limit,
            with_payload=include,
            with_vector=with_vector,
            offset=offset,
        )
        return [convert_point_to_entry(point) for point in results]

    async def batch_search(
        self,
        queries: list[str],
        limit: int = 5,
        filter: Filter | None = None,
        include: dict | bool = True,
        with_vector: bool = False,
        offset: int | None = None,
        batch_size: int = 1000,
    ) -> list[list[Entry]]:
        """Semantic search for a batch of queries."""
        query_embs = await self.embedder.embed(queries)
        if isinstance(include, dict):
            include = payload_dict_to_field_list(include)

        all_results = []
        for i in range(0, len(query_embs), batch_size):
            # Get the current batch of embeddings using slicing.
            batch_embs = query_embs[i:i + batch_size]

            requests = [
                QueryRequest(
                    query=emb,
                    limit=limit,
                    with_payload=include,
                    with_vector=with_vector,
                    offset=offset,
                    filter=filter,
                )
                for emb in batch_embs
            ]

            if requests:
                # Await the results for the current batch.
                batch_results = await self.client.query_batch_points(
                    collection_name=self.collection, requests=requests
                )
                all_results.extend(batch_results)
        return [
            [convert_point_to_entry(point) for point in result]
            for result in all_results
        ]

    async def search_by_id(
        self,
        point_id: str,
        limit: int = 5,
        filter: Filter | None = None,
        include: dict | bool = True,
        with_vector: bool = False,
        offset: int | None = None,
    ) -> list[Entry]:
        """Semantic search for an existing item using the point ID."""
        if isinstance(include, dict):
            include = payload_dict_to_field_list(include)
        results = await self.client.query_points(
            collection_name=self.collection,
            query=point_id,
            query_filter=filter,
            limit=limit,
            offset=offset,
            with_payload=include,
            with_vector=with_vector,
        )
        return [convert_point_to_entry(point) for point in results]

    async def batch_search_by_id(
        self,
        point_ids: list[str],
        limit: int = 5,
        filter: Filter | None = None,
        include: dict | bool = True,
        with_vector: bool = False,
        offset: int | None = None,
        batch_size: int = 1000
    ) -> list[list[Entry]]:
        """Batch search for multiple items using their point IDs."""
        all_results = []
        if isinstance(include, dict):
            include = payload_dict_to_field_list(include)
        for i in range(0, len(point_ids), batch_size):
            # Get the current batch of embeddings using slicing.
            batch_ids = point_ids[i:i + batch_size]

            requests = [
                QueryRequest(
                    query=point_id,
                    limit=limit,
                    with_payload=include,
                    with_vector=with_vector,
                    offset=offset,
                    filter=filter,
                )
                for point_id in batch_ids
            ]

            if requests:
                # Await the results for the current batch.
                batch_results = await self.client.query_batch_points(
                    collection_name=self.collection, requests=requests
                )
                all_results.extend(batch_results)
        return [
            [convert_point_to_entry(point) for point in result]
            for result in all_results
        ]

    async def filt(
        self,
        filter: Filter,
        limit: int = 1000,
        include: dict | bool = True,
        order_by: OrderBy | None = None,
        offset: int | None = None,
    ) -> list[Entry]:
        """Retrieve all notes from the Qdrant store."""
        if order_by is None:
            order_by = OrderBy(
                key="created_at",
                direction="desc"
            )

        results = []
        next_offset = offset
        page_size = min(limit, 1000)

        if isinstance(include, dict):
            include = payload_dict_to_field_list(include)
            if "created_at" not in include:
                include.append("created_at")

        while len(results) < limit:
            points, next_offset = await self.client.scroll(
                collection_name=self.collection,
                scroll_filter=filter,
                limit=page_size,
                offset=next_offset,
                with_payload=include or False,
                with_vectors=False,
                order_by=order_by,
            )
            results.extend(points)
            if not points or next_offset is None:
                break

        return [convert_point_to_entry(point) for point in results[:limit]]

    async def close(self):
        """Close the Qdrant client connection."""
        await self.client.close()
        logger.info("Qdrant client connection closed.")
