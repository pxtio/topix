"""RAG pipeline."""

import os

from pydantic import BaseModel

from topix.datatypes.property import URLProperty, NumberProperty, TextProperty
from topix.datatypes.resource import RichText
from topix.nlp.parsing import MistralParser
from topix.nlp.chunking import Chunker
from topix.store.qdrant.store import ContentStore
from topix.datatypes.file.document import Document, DocumentProperties


class ParsingConfig(BaseModel):
    """RAG configuration."""
    ocr_parser: MistralParser = MistralParser.from_config()
    chunker: Chunker = Chunker()
    vector_store: ContentStore = ContentStore.from_config()


class ParsingPipeline:
    """Parsing pipeline."""
    def __init__(self, config: ParsingConfig):
        self.config = config

    async def process_file(self, filepath: str) -> list[str]:
        """Process a file."""
        parsed_file = await self.config.ocr_parser.parse(filepath)

        document_name = os.path.basename(filepath)

        document = Document(
            label=RichText(markdown=document_name),
            properties=DocumentProperties(
                url=URLProperty(url=filepath),
                number_of_pages=NumberProperty(number=len(parsed_file))
            )
        )

        elements = self.config.chunker.chunk_markdowns(parsed_file)

        for element in elements:
            element.document_uid = document.id
            element.properties.document_label = TextProperty(text=document_name)

        elements.append(document)

        # embed and save chunks to vector store
        await self.config.vector_store.add(elements)

        return elements
