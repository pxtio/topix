"""RAG pipeline."""

import os

from fastapi.concurrency import run_in_threadpool

from topix.datatypes.file.chunk import Chunk
from topix.datatypes.file.document import Document, DocumentProperties, DocumentStatusEnum
from topix.datatypes.property import NumberProperty, TextProperty, URLProperty
from topix.datatypes.resource import RichText
from topix.nlp.chunking import Chunker
from topix.nlp.parser import MistralParser
from topix.store.qdrant.store import ContentStore


class ParsingPipeline:
    """Parsing pipeline."""

    def __init__(self) -> None:
        """Initialize the parsing pipeline."""
        self.parser = MistralParser.from_config()
        self.chunker = Chunker()
        self.vector_store = ContentStore.from_config()

    async def process_file(
        self,
        filepath: str,
        id: str | None = None,
        file_url: str | None = None
    ) -> tuple[Document, list[Chunk]]:
        """Process a file.

        Args:
            filepath (str): The path to the file to process.
            id (str | None): The optional ID to assign to the document.
            file_url (str | None): The optional URL to assign to the document.

        Returns:
            tuple[Document, list[Chunk]]: The processed document and its chunks.

        """
        parsed_file = await self.parser.parse(filepath)

        document_name = os.path.basename(filepath)

        document = Document(
            label=RichText(markdown=document_name),
            properties=DocumentProperties(
                number_of_pages=NumberProperty(number=len(parsed_file))
            )
        )

        if id is not None:
            document.id = id
        if file_url is not None:
            document.properties.url = URLProperty(url=file_url)

        # move chunking to threadpool to avoid blocking event loop
        elements = await run_in_threadpool(
            self.chunker.chunk_markdowns,
            parsed_file
        )

        for element in elements:
            element.document_uid = document.id
            element.properties.document_label = TextProperty(text=document_name)

        return document, elements

    async def save_to_store(
        self,
        graph_uid: str,
        document: Document,
        chunks: list[Chunk]
    ) -> None:
        """Save document and chunks to vector store.

        Args:
            graph_uid (str): The graph UID.
            document (Document): The document to save.
            chunks (list[Chunk]): The chunks to save.

        """
        document.graph_uid = graph_uid
        document.properties.status.value = DocumentStatusEnum.COMPLETED
        for chunk in chunks:
            chunk.graph_uid = graph_uid
        await self.vector_store.add([document])
        await self.vector_store.add(chunks)
