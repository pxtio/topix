"""Module containing the MistralParser class used to parse a PDF document using the Mistral OCR API."""

import base64
import logging
import os

from mistralai import Mistral, OCRPageObject
from pypdf import PdfReader

from topix.config.config import Config, MistralConfig
from topix.datatypes.mime import MimeTypeEnum

logger = logging.getLogger(__name__)


class MistralParser():
    """A class used to parse a PDF document using the Mistral OCR API."""

    def __init__(self, api_key: str | None = None):
        """Initialize the MistralParser."""
        if api_key is None:
            raise ValueError("API key is required, got None")
        self.client = Mistral(api_key=api_key)

    @classmethod
    def from_config(cls):
        """Create an instance of MistralParser from configuration."""
        config: Config = Config.instance()
        mistral_config: MistralConfig = config.run.apis.mistral

        return cls(api_key=mistral_config.api_key.get_secret_value() if mistral_config.api_key else None)

    def get_num_pages(self, fname: str) -> int:
        """Get the number of pages in a PDF file.

        Args:
            fname (str): The path to the PDF file.

        Returns:
            int: The number of pages in the PDF file. If an error occurs, -1 is returned.

        """
        try:
            with open(fname, 'rb') as f:
                # Create a PdfReader object
                reader = PdfReader(f)

                # Get the number of pages
                number_of_pages = len(reader.pages)

            return number_of_pages
        except Exception as e:
            logger.error(f"Error while getting the number of pages in the PDF file: {e}")
            return -1

    def detect_mime_type(self, filepath: str) -> MimeTypeEnum:
        """Detect the MIME type of the document.

        Returns:
            MimeTypeEnum: MIME type of the document

        """
        suffix = os.path.splitext(filepath)[1]
        if suffix.lower() == ".pdf":
            return MimeTypeEnum.PDF
        raise ValueError("Unsupported file format")

    def post_process_page(self, page: OCRPageObject) -> dict[str, int | str]:
        """Post-process the page data returned by the Mistral OCR API and return a markdown string.

        Args:
            page : page data returned by the Mistral OCR API

        Returns:
            dict[str, int | str]: page in markdown format and page number

        """
        return {
            'markdown': page.markdown,
            'page': page.index,
        }

    def encode_pdf(self, pdf_path: str) -> str:
        """Encode the PDF file to base64.

        Args:
            pdf_path (str): The path to the PDF file.

        Returns:
            str: The base64 encoded PDF file.

        """
        with open(pdf_path, "rb") as pdf_file:
            return base64.b64encode(pdf_file.read()).decode('utf-8')

    async def parse(
        self,
        filepath: str,
        max_pages: int = 200,
    ) -> list[dict[str, int | str]]:
        """Parse the PDF document at the given file path using the Mistral OCR API.

        Args:
            filepath (str): Path to the PDF file to parse.
            max_pages (int, optional): Maximum number of pages allowed to parse. Defaults to 200.

        Raises:
            ValueError: If the file type is not supported.
            AssertionError: If the number of pages in the PDF exceeds max_pages.
            Exception: If an error occurs during OCR processing.

        Returns:
            list[dict[str, int | str]]: A list of dictionaries containing each page's markdown content and page number.

        """
        assert self.detect_mime_type(filepath) == MimeTypeEnum.PDF, "Unsupported file format"
        assert self.get_num_pages(filepath) <= max_pages, f"PDF file exceeds the maximum number of pages: {max_pages}"

        res = await self.client.ocr.process_async(
            model="mistral-ocr-latest",
            document={
                "type": "document_url",
                "document_url": f"data:application/pdf;base64,{self.encode_pdf(filepath)}"
            },
            include_image_base64=False,
        )

        logger.info(f"Number of pages in the PDF file: {len(res.pages)}")

        pages = []
        for page in res.pages:
            pages.append(self.post_process_page(page))

        return pages
