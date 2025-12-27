"""RAG pipeline."""

import os

from fastapi.concurrency import run_in_threadpool

from topix.datatypes.file.chunk import Chunk
from topix.datatypes.file.document import Document, DocumentProperties
from topix.datatypes.property import NumberProperty, TextProperty
from topix.datatypes.resource import RichText
from topix.nlp.chunking import Chunker
from topix.nlp.parser import MistralParser
from topix.store.qdrant.store import ContentStore


class ParsingConfig():
    """RAG configuration."""

    ocr_parser: MistralParser = MistralParser.from_config()
    chunker: Chunker = Chunker()
    vector_store: ContentStore = ContentStore.from_config()


class ParsingPipeline:
    """Parsing pipeline."""

    def __init__(self, config: ParsingConfig = ParsingConfig()):
        """Initialize the parsing pipeline."""
        self.config = config

    async def process_file(
        self,
        filepath: str,
        id: str | None = None,
        file_url: str | None = None,
    ) -> list[Chunk | Document]:
        """Process a file."""
        parsed_file = await self.config.ocr_parser.parse(filepath)

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
            document.properties.url = TextProperty(text=file_url)

        # move chunking to threadpool to avoid blocking event loop
        elements = await run_in_threadpool(
            self.config.chunker.chunk_markdowns,
            parsed_file
        )

        for element in elements:
            element.document_uid = document.id
            element.properties.document_label = TextProperty(text=document_name)

        elements.append(document)

        # embed and save chunks to vector store
        await self.config.vector_store.add(elements)

        return elements
