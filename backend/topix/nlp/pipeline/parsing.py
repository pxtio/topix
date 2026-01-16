"""RAG pipeline."""

import asyncio
import logging
import os

from fastapi.concurrency import run_in_threadpool

from topix.agents.datatypes.context import Context
from topix.agents.document.mindmap import DocumentMindmapAgent
from topix.agents.document.summary import DocumentSummaryAgent
from topix.agents.mindmap.mapify import convert_mapify_output_to_notes_links
from topix.agents.run import AgentRunner
from topix.datatypes.file.chunk import Chunk
from topix.datatypes.file.document import Document, DocumentProperties, DocumentStatusEnum
from topix.datatypes.note.link import Link
from topix.datatypes.note.note import Note
from topix.datatypes.property import NumberProperty, TextProperty, URLProperty
from topix.datatypes.resource import RichText
from topix.nlp.chunking import Chunker
from topix.nlp.parser import MistralParser
from topix.store.qdrant.store import ContentStore

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

    async def save_to_store(
        self,
        graph_uid: str,
        document: Document,
        chunks: list[Chunk],
        notes: list[Note],
        links: list[Link]
    ) -> None:
        """Save document and chunks to vector store.

        Args:
            graph_uid (str): The graph UID.
            document (Document): The document to save.
            chunks (list[Chunk]): The chunks to save.
            notes (list[Note]): The notes to save.
            links (list[Link]): The links to save.

        """
        document.properties.status.value = DocumentStatusEnum.COMPLETED
        elements = [document] + chunks + notes + links

        for element in elements:
            element.graph_uid = graph_uid

        await self.vector_store.add(elements)
