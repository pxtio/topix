"""RAG pipeline."""

import json
import os

from topix.datatypes.file.document import Document, DocumentProperties
from topix.datatypes.property import NumberProperty, TextProperty, URLProperty
from topix.datatypes.resource import RichText
from topix.nlp.chunking import Chunker
from topix.nlp.parser import MistralParser
from topix.store.qdrant.store import ContentStore
from topix.store.redis.store import RedisStore


class ParsingConfig():
    """RAG configuration."""

    ocr_parser: MistralParser = MistralParser().from_config()
    chunker: Chunker = Chunker()
    vector_store: ContentStore = ContentStore.from_config()  # TODO: fix the from_config


class ParsingPipeline:
    """Parsing pipeline."""

    def __init__(self, config: ParsingConfig = ParsingConfig()):
        """Initialize the parsing pipeline."""
        self.config = config

    async def process_file(self, filepath: str) -> list[str]:
        """Process a file."""
        parsed_file = await self.config.ocr_parser.parse(filepath)

        document_name = os.path.basename(filepath)

        document = Document(
            label=RichText(markdown=document_name),
            properties=DocumentProperties(
                url=URLProperty(url=URLProperty.URL(url=filepath)),  # TODO: simplifier le url property, 3 niveaux!
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

    async def process_file_with_status(
        self,
        filepath: str,
        job_id: str,
        redis_store: RedisStore
    ) -> list[str]:
        """Process a file and update status in Redis."""
        try:
            # Update status to processing
            status_data = {
                "status": "processing",
                "filepath": filepath,
                "message": "File parsing in progress"
            }
            await redis_store.redis.setex(
                f"parse_job:{job_id}",
                3600,  # Expire after 1 hour
                json.dumps(status_data)
            )

            # Process the file
            elements = await self.process_file(filepath)

            # Update status to completed
            document_name = os.path.basename(filepath)
            status_data = {
                "status": "completed",
                "filepath": filepath,
                "filename": document_name,
                "message": "File parsing completed successfully",
                "document_id": elements[-1].id if elements else None,
                "num_elements": len(elements)
            }
            await redis_store.redis.setex(
                f"parse_job:{job_id}",
                3600,  # Expire after 1 hour
                json.dumps(status_data)
            )

            return elements
        except Exception as e:
            # Update status to failed
            status_data = {
                "status": "failed",
                "filepath": filepath,
                "message": f"File parsing failed: {str(e)}",
                "error": str(e)
            }
            await redis_store.redis.setex(
                f"parse_job:{job_id}",
                3600,  # Expire after 1 hour
                json.dumps(status_data)
            )
            raise
