"""RAG pipeline."""

import os

from dataclasses import dataclass, field

from fastapi.concurrency import run_in_threadpool

from topix.datatypes.file.chunk import Chunk
from topix.datatypes.file.document import Document, DocumentProperties
from topix.datatypes.property import NumberProperty, TextProperty, URLProperty
from topix.datatypes.resource import RichText
from topix.nlp.chunking import Chunker
from topix.nlp.parser import MistralParser
from topix.store.qdrant.store import ContentStore


@dataclass
class ParsingConfig:
    """RAG configuration."""

    ocr_parser: MistralParser = field(default_factory=MistralParser.from_config)
    chunker: Chunker = field(default_factory=Chunker)
    vector_store: ContentStore = field(default_factory=ContentStore.from_config)


class ParsingPipeline:
    """Parsing pipeline."""

    def __init__(self, config: ParsingConfig | None = None):
        """Initialize the parsing pipeline."""
        self.config = config or ParsingConfig()

    async def process_file(
        self,
        filepath: str,
        id: str | None = None,
        file_url: str | None = None,
    ) -> tuple[Document, list[Chunk]]:
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
            document.properties.url = URLProperty(url=file_url)

        # move chunking to threadpool to avoid blocking event loop
        elements = await run_in_threadpool(
            self.config.chunker.chunk_markdowns,
            parsed_file
        )

        for element in elements:
            element.document_uid = document.id
            element.properties.document_label = TextProperty(text=document_name)

        # embed and save chunks to vector store
        await self.config.vector_store.add([document])
        await self.config.vector_store.add(elements)

        return document, elements
