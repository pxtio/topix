"""ContentStore for managing notes and messages in Qdrant."""

import logging

from datetime import datetime

from qdrant_client import AsyncQdrantClient
from qdrant_client.models import (
    Distance,
    Filter,
    FilterSelector,
    MultiVectorComparator,
    MultiVectorConfig,
    OrderBy,
    PointStruct,
    PointVectors,
    QueryRequest,
    ScalarQuantization,
    ScalarQuantizationConfig,
    SetPayload,
    SetPayloadOperation,
    VectorParams,
)

from topix.config.config import Config, QdrantConfig
# from topix.datatypes.property import TextProperty
from topix.datatypes.resource import Resource
from topix.nlp.embed import DIMENSIONS, OpenAIEmbedder
from topix.store.qdrant.utils import (
    RetrieveOutput,
    convert_point,
    payload_dict_to_field_list,
)

logger = logging.getLogger(__name__)

DEFAULT_COLLECTION = "topix"

INDEX_FIELDS = [
    ("created_at", "datetime"),
    ("updated_at", "datetime"),
    ("deleted_at", "datetime"),
    ("type", "keyword"),
    # message
    ("chat_uid", "keyword"),
    # note, link
    ("graph_uid", "keyword"),
    # subscription
    ("user_uid", "keyword"),
    ("subscription_id", "keyword"),
    # the unique id for each resource
    ("id", "uuid"),
]

MAX_PAGE_SIZE = 10000


class ContentStore:
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
        qdrant_config: QdrantConfig = config.run.databases.qdrant
        collection = qdrant_config.collection

        qdrant_client = AsyncQdrantClient(
            host=qdrant_config.host,
            port=qdrant_config.port,
            https=qdrant_config.https,
            api_key=qdrant_config.api_key.get_secret_value() if qdrant_config.api_key else None,
        )
        embedder = OpenAIEmbedder.from_config()

        return cls(
            qdrant_client=qdrant_client, embedder=embedder, collection=collection
        )

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

    async def delete(
        self, ids: list[str | int], hard_delete: bool = False, refresh: bool = True
    ) -> None:
        """Delete multiple data objects by their IDs."""
        if not hard_delete:
            await self.client.set_payload(
                collection_name=self.collection,
                payload={"deleted_at": datetime.now().isoformat()},
                points=ids,
            )
        else:
            await self.client.delete(
                collection_name=self.collection,
                points_selector=ids,
                wait=refresh,
            )
        logger.info(f"Successfully deleted {len(ids)} data from the collection.")

    async def delete_by_filters(
        self, filters: Filter, hard_delete: bool = False, refresh: bool = True
    ) -> None:
        """Delete Entry objects based on a filter condition."""
        if not hard_delete:
            results = await self.filt(
                filters=filters,
                limit=float('inf'),
                with_vector=False,
                include=False,
                order_by=None
            )
            point_ids = [result.id for result in results]
            if point_ids:
                await self.client.set_payload(
                    collection_name=self.collection,
                    payload={"deleted_at": datetime.now().isoformat()},
                    points=point_ids,
                )
            logger.info(f"Successfully marked {len(point_ids)} data as deleted.")
        else:
            await self.client.delete(
                collection_name=self.collection,
                points_selector=FilterSelector(filter=filters),
                wait=refresh,
            )
            logger.info("Successfully deleted.")

    async def _embed(  # noqa: C901
        self, entries: list[Resource | dict]
    ) -> list[list[list[float]] | None]:
        searchable_texts = []
        indices = []
        for i, entry in enumerate(entries):
            if isinstance(entry, dict):
                embeddable = {}
                if entry.get("content") and entry["content"].get("searchable"):
                    # searchable_texts.append(entry["content"]["markdown"])
                    # indices.append(i)
                    embeddable["content"] = entry["content"]["markdown"]
                if entry.get("label") and entry["label"].get("searchable"):
                    # searchable_texts.append(entry["label"]["markdown"])
                    # indices.append(i)
                    embeddable["label"] = entry["label"]["markdown"]

                # for prop in entry.get("properties", {}).values():
                #     if isinstance(prop, dict):
                #         if prop.get("searchable") and prop.get("text"):
                #             searchable_texts.append(prop["text"])
                #             indices.append(i)
            else:
                embeddable = entry.to_embeddable()
                # Get content and label
                # if entry.content and entry.content.searchable:
                #     searchable_texts.append(entry.content.markdown)
                #     indices.append(i)
                # if entry.label and entry.label.searchable:
                #     searchable_texts.append(entry.label.markdown)
                #     indices.append(i)

                # # Get all searchable text properties
                # for prop in entry.properties.__dict__.values():
                #     if isinstance(prop, TextProperty):
                #         if prop.searchable and prop.text:
                #             searchable_texts.append(prop.text)
                #             indices.append(i)
            searchable_texts.append(str(embeddable))

        embeds = await self.embedder.embed(searchable_texts)
        # Create a list of embeddings with the same length as entries
        embeddings = [None] * len(entries)
        for idx, i in enumerate(indices):
            if embeddings[i] is None:
                embeddings[i] = []
            embeddings[i].append(embeds[idx])
            # embeddings[i] = embeds[idx]

        # Fill in None embeddings with zero vectors
        for i, emb in enumerate(embeddings):
            if emb is None:
                embeddings[i] = [[0.0] * DIMENSIONS]

        return embeddings

    async def add(
        self,
        resources: list[Resource],
        refresh: bool = True,
        batch_size: int = 1000,
    ):
        """Create a new note in the Qdrant store."""
        embeddings = await self._embed(resources)

        for i in range(0, len(resources), batch_size):
            batch_entries = resources[i:i + batch_size]
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
        logger.info(f"Added {len(resources)} data to the Qdrant store.")

    async def _update_payloads(
        self, ids: list[str | int], fields: list[dict], refresh: bool = False
    ):
        """Update payload fields of existing objects."""
        update_operations = [
            SetPayloadOperation(set_payload=SetPayload(points=[id_], payload=field))
            for id_, field in zip(ids, fields)
        ]
        await self.client.batch_update_points(
            collection_name=self.collection,
            update_operations=update_operations,
            wait=refresh,
        )

    async def _update_embs(
        self,
        ids: list[str | int],
        embeds: list[list[list[float]] | None],
    ):
        points = [
            PointVectors(
                id=id_,
                vector=emb,
            )
            for id_, emb in zip(ids, embeds)
            if emb
        ]
        if points:
            await self.client.update_vectors(
                collection_name=self.collection,
                points=points,
            )

    async def update(
        self, fields: list[dict], refresh: bool = True, batch_size: int = 1000
    ):
        """Update fields of existing objects.

        Updating is risky because it regenerates embeddings
        from the provided searchable fields and replaces the entire vector set.

        For example, if both label and content are searchable,
        the object is stored as a multi-vector with two embeddings.

        But if you later update the object while providing only content,
        the label embedding is lost
        — the update overwrites the full vector representation rather
        than merging partial updates.
        """
        ids = [field["id"] for field in fields]
        embeds = await self._embed(fields)

        for i in range(0, len(fields), batch_size):
            batch_fields = fields[i:i + batch_size]
            batch_ids = ids[i:i + batch_size]
            batch_embeds = embeds[i:i + batch_size]

            await self._update_payloads(batch_ids, batch_fields, refresh)
            await self._update_embs(batch_ids, batch_embeds)
        logger.info(f"Updated {len(fields)} data in the Qdrant store.")

    async def count(self, filter: Filter | None = None) -> int:
        """Count the number of objects in the collection."""
        res = await self.client.count(
            collection_name=self.collection,
            count_filter=filter,
        )
        return res.count

    async def get(
        self,
        ids: list[str | int],
        include: dict | bool = True,
        with_vector: bool = False,
    ) -> list[RetrieveOutput]:
        """Retrieve multiple Resource objects by their IDs."""
        if isinstance(include, dict):
            include: list = payload_dict_to_field_list(include)
            if "type" not in include:
                include.append("type")
        points = await self.client.retrieve(
            collection_name=self.collection,
            ids=ids,
            with_payload=include,
            with_vectors=with_vector,
        )
        res = [convert_point(point) for point in points]
        return res

    async def search(
        self,
        query: str,
        limit: int = 5,
        filter: Filter | None = None,
        include: dict | bool = True,
        with_vector: bool = False,
        offset: int | None = None,
    ) -> list[RetrieveOutput]:
        """Semantic Search for text query."""
        query_vector = (await self.embedder.embed([query]))[0]
        if isinstance(include, dict):
            include = payload_dict_to_field_list(include)
            if "type" not in include:
                include.append("type")
        results = await self.client.query_points(
            collection_name=self.collection,
            query=query_vector,
            query_filter=filter,
            limit=limit,
            with_payload=include,
            with_vectors=with_vector,
            offset=offset,
        )
        return [convert_point(point) for point in results.points]

    async def batch_search(
        self,
        queries: list[str],
        limit: int = 5,
        filter: Filter | None = None,
        include: dict | bool = True,
        with_vector: bool = False,
        offset: int | None = None,
        batch_size: int = 1000,
    ) -> list[list[RetrieveOutput]]:
        """Semantic search for a batch of queries."""
        query_embs = await self.embedder.embed(queries)
        if isinstance(include, dict):
            include = payload_dict_to_field_list(include)
            if "type" not in include:
                include.append("type")

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
            [convert_point(point) for point in result.points] for result in all_results
        ]

    async def search_by_id(
        self,
        point_id: str,
        limit: int = 5,
        filter: Filter | None = None,
        include: dict | bool = True,
        with_vector: bool = False,
        offset: int | None = None,
    ) -> list[RetrieveOutput]:
        """Semantic search for an existing item using the point ID."""
        if isinstance(include, dict):
            include = payload_dict_to_field_list(include)
            if "type" not in include:
                include.append("type")
        results = await self.client.query_points(
            collection_name=self.collection,
            query=point_id,
            query_filter=filter,
            limit=limit,
            offset=offset,
            with_payload=include,
            with_vectors=with_vector,
        )
        return [convert_point(point) for point in results.points]

    async def batch_search_by_id(
        self,
        point_ids: list[str],
        limit: int = 5,
        filter: Filter | None = None,
        include: dict | bool = True,
        with_vector: bool = False,
        offset: int | None = None,
        batch_size: int = 1000,
    ) -> list[list[RetrieveOutput]]:
        """Batch search for multiple items using their point IDs."""
        all_results = []
        if isinstance(include, dict):
            include = payload_dict_to_field_list(include)
            if "type" not in include:
                include.append("type")
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
            [convert_point(point) for point in result.points] for result in all_results
        ]

    async def filt(
        self,
        filters: Filter,
        limit: int = 1000,
        include: dict | bool = True,
        with_vector: bool = False,
        order_by: OrderBy | dict | None = {"key": "created_at", "direction": "desc"},
        offset: str | None = None,
    ) -> list[RetrieveOutput]:
        """Filter points in the collection based on the given filters."""
        results = []
        next_offset = offset

        if order_by is not None:
            page_size = limit
        else:
            page_size = min(limit, MAX_PAGE_SIZE)

        if isinstance(include, dict):
            include: list = payload_dict_to_field_list(include)
            if "created_at" not in include:
                include.append("created_at")
            if "type" not in include:
                include.append("type")

        while len(results) < limit:
            points, next_offset = await self.client.scroll(
                collection_name=self.collection,
                scroll_filter=filters,
                limit=page_size,
                offset=next_offset,
                with_payload=include,
                with_vectors=with_vector,
                order_by=order_by,
            )
            results.extend(points)
            if not points or next_offset is None:
                break

        if len(results) > limit:
            results = results[:limit]
        return [convert_point(point) for point in results]

    async def close(self):
        """Close the Qdrant client connection."""
        await self.client.close()
        logger.info("Qdrant client connection closed.")
