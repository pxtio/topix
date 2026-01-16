"""RAG pipeline."""

import asyncio
import logging
import os

from fastapi.concurrency import run_in_threadpool
from qdrant_client.models import FieldCondition, Filter, MatchAny, MatchValue

from topix.agents.datatypes.context import Context
from topix.agents.document.mindmap import DocumentMindmapAgent
from topix.agents.document.summary import DocumentSummaryAgent
from topix.agents.mindmap.mapify import convert_mapify_output_to_notes_links
from topix.agents.run import AgentRunner
from topix.datatypes.file.chunk import Chunk
from topix.datatypes.file.document import Document, DocumentProperties, DocumentStatusEnum
from topix.datatypes.note.link import Link
from topix.datatypes.note.note import Note
from topix.datatypes.property import (
    NumberProperty,
    PositionProperty,
    TextProperty,
    URLProperty,
)
from topix.datatypes.resource import RichText
from topix.nlp.chunking import Chunker
from topix.nlp.parser import MistralParser
from topix.store.qdrant.store import ContentStore
from topix.utils.graph.layout import LayoutDirection, displace_nodes, layout_directed

logger = logging.getLogger(__name__)


class ParsingPipeline:
    """Parsing pipeline."""

    def __init__(self) -> None:
        """Initialize the parsing pipeline."""
        self.parser = MistralParser.from_config()
        self.chunker = Chunker()
        self.vector_store = ContentStore.from_config()
        self.summarizer = DocumentSummaryAgent()
        self.mapifier = DocumentMindmapAgent()
        self.runner = AgentRunner()

    async def summarize_document(
        self,
        document_text: str,
    ) -> str:
        """Summarize the document text.

        Args:
            document_text (str): The text of the document to summarize.

        Returns:
            str: The summary of the document.

        """
        summary = await self.runner.run(
            starting_agent=self.summarizer,
            input=document_text,
            context=Context()
        )
        return summary

    async def create_mindmap(
        self,
        document_summary: str,
    ) -> tuple[list[Note], list[Link]]:
        """Create a mindmap from the document summary.

        Args:
            document_summary (str): The summary of the document.

        Returns:
            tuple[list[Note], list[Link]]: The mindmap representation.

        """
        mapify_output = await self.runner.run(
            starting_agent=self.mapifier,
            input=document_summary,
            context=Context()
        )

        notes, links = convert_mapify_output_to_notes_links(mapify_output)
        return notes, links

    async def _mapify(
        self,
        document_text: str,
    ) -> tuple[list[Note], list[Link]]:
        logger.info("Starting document summarization for mindmap creation.")
        document_summary = await self.summarize_document(document_text)
        notes, links = await self.create_mindmap(document_summary)
        return notes, links

    async def process_file(
        self,
        filepath: str,
        id: str | None = None,
        file_url: str | None = None
    ) -> tuple[Document, list[Chunk], list[Note], list[Link]]:
        """Process a file.

        Args:
            filepath (str): The path to the file to process.
            id (str | None): The optional ID to assign to the document.
            file_url (str | None): The optional URL to assign to the document.

        Returns:
            tuple[Document, list[Chunk], list[Note], list[Link]]: The processed document and its chunks.

        """
        pages = await self.parser.parse(filepath)

        document_name = os.path.basename(filepath)

        document = Document(
            label=RichText(markdown=document_name),
            properties=DocumentProperties(
                number_of_pages=NumberProperty(number=len(pages))
            )
        )

        if id is not None:
            document.id = id
        if file_url is not None:
            document.properties.url = URLProperty(url=file_url)

        # move chunking to threadpool to avoid blocking event loop
        chunks = await run_in_threadpool(
            self.chunker.chunk_markdowns,
            pages
        )

        chunks, (notes, links) = await asyncio.gather(
            run_in_threadpool(
                self.chunker.chunk_markdowns,
                pages
            ),
            self._mapify(
                document_text="\n\n".join(page['markdown'] for page in pages)
            )
        )

        for chunk in chunks:
            chunk.document_uid = document.id
            chunk.properties.document_label = TextProperty(text=document_name)

        links.append(
            Link(
                source=document.id,
                target=notes[0].id,
            )
        )

        return document, chunks, notes, links

    async def get_graph_nodes(
        self,
        graph_uid: str,
        limit: int = 1000,
    ) -> list[Note | Document]:
        """Retrieve graph nodes (notes and documents) by graph UID.

        Args:
            graph_uid (str): Graph UID to filter by.
            limit (int): Maximum number of nodes to retrieve.

        Returns:
            list[Note | Document]: Nodes belonging to the graph.

        """
        filters = Filter(
            must=[
                FieldCondition(
                    key="graph_uid",
                    match=MatchValue(value=graph_uid),
                ),
                FieldCondition(
                    key="type",
                    match=MatchAny(any=["note", "document"]),
                ),
            ],
        )
        results = await self.vector_store.filt(
            filters=filters,
            include=True,
            limit=limit,
        )
        return [result.resource for result in results]

    def apply_layout_to_document_mindmap(
        self,
        nodes: list[Note | Document],
        links: list[Link],
        direction: LayoutDirection = LayoutDirection.LEFT_RIGHT,
        hgap: float = 75,
        vgap: float = 150,
    ) -> None:
        """Apply hierarchical layout to document and its mindmap nodes.

        Args:
            nodes (list[Note | Document]): Mindmap nodes.
            links (list[Link]): Mindmap links.
            direction (LayoutDirection): Layout direction ("TB", "BT", "LR", "RL").
            hgap (float): Horizontal gap for layout.
            vgap (float): Vertical gap for layout.

        Returns:
            None

        """
        if not nodes:
            return

        node_ids = [node.id for node in nodes]
        node_id_set = set(node_ids)
        edge_pairs = [
            [link.source, link.target]
            for link in links
            if link.source in node_id_set and link.target in node_id_set
        ]

        positions = layout_directed(
            nodes=node_ids,
            edges=edge_pairs,
            direction=direction,
            hgap=hgap,
            vgap=vgap,
        )

        for node in nodes:
            x, y = positions[node.id]
            if node.properties.node_position.position is None:
                node.properties.node_position.position = PositionProperty.Position(
                    x=x,
                    y=y,
                )
            else:
                node.properties.node_position.position.x = x
                node.properties.node_position.position.y = y

    async def place_document_mindmap_outside_graph(
        self,
        graph_uid: str,
        nodes: list[Note | Document],
        links: list[Link],
        direction: LayoutDirection = LayoutDirection.LEFT_RIGHT,
        hgap: float = 75,
        vgap: float = 150,
        gap: float = 100.0,
        limit: int = 1000,
    ) -> list[Note | Document]:
        """Layout a document mindmap and position it outside existing nodes.

        Args:
            graph_uid (str): Graph UID used to fetch existing nodes.
            nodes (list[Note | Document]): Mindmap nodes.
            links (list[Link]): Mindmap links.
            direction (LayoutDirection): Layout direction ("TB", "BT", "LR", "RL").
            hgap (float): Horizontal gap for layout.
            vgap (float): Vertical gap for layout.
            gap (float): Vertical gap between existing nodes and new layout.
            limit (int): Maximum number of existing nodes to consider.

        Returns:
            list[Note | Document]

        """
        if not nodes:
            return []

        logger.info("Applying layout to document mindmap.")
        await run_in_threadpool(
            self.apply_layout_to_document_mindmap,
            nodes,
            links,
            direction,
            hgap,
            vgap,
        )

        existing_nodes = await self.get_graph_nodes(
            graph_uid=graph_uid,
            limit=limit,
        )
        if not existing_nodes:
            return nodes

        logger.info("Displacing document mindmap outside existing graph nodes.")
        displaced_nodes = await run_in_threadpool(
            displace_nodes,
            existing_nodes,
            nodes,
            gap,
        )

        return displaced_nodes

    async def save_to_store(
        self,
        graph_uid: str,
        document: Document,
        chunks: list[Chunk],
        notes: list[Note],
        links: list[Link]
    ) -> tuple[Document, list[Note], list[Link]]:
        """Save document and chunks to vector store.

        Args:
            graph_uid (str): The graph UID.
            document (Document): The document to save.
            chunks (list[Chunk]): The chunks to save.
            notes (list[Note]): The notes to save.
            links (list[Link]): The links to save.

        """
        document.properties.status.value = DocumentStatusEnum.COMPLETED
        nodes = notes + [document]
        displaced_nodes = await self.place_document_mindmap_outside_graph(
            graph_uid=graph_uid,
            nodes=nodes,
            links=links,
        )
        elements = displaced_nodes + chunks + links

        for element in elements:
            element.graph_uid = graph_uid

        await self.vector_store.add(elements)

        displaced_by_id = {node.id: node for node in displaced_nodes}
        updated_document = displaced_by_id.get(document.id, document)
        updated_notes = [
            displaced_by_id.get(note.id, note) for note in notes
        ]
        return updated_document, updated_notes, links
