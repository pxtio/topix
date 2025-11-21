# Take a path (loacal first) and parse it, return a json with the markdown and the page number
"""This module contains the MistralOCRParser class used to parse a PDF document using the Mistral OCR API."""

import logging
import os
import base64
from pypdf import PdfReader
from mistralai import Mistral

from topix.datatypes.mime import MimeTypeEnum

logger = logging.getLogger(__name__)


class MistralParser():
    """A class used to parse a PDF document using the Mistral OCR API.
    """

    def __init__(self, api_key: str):
        self.client = Mistral(api_key=api_key)

    def get_pdf_num_pages(self, fname: str) -> int:
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

    def post_process_page(self, page) -> dict[str, int | str]:
        """Post-process the page data returned by the Mistral OCR API and return a markdown string.

        Args:
            page : page data returned by the Mistral OCR API

        Returns:
            dict[str, int | str]: page in markdown format and page number

        """
        return {
            'markdown': page.markdown,
            'page': page.page_number,
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
    ) -> dict[str, int | str]:
        """Parse the PDF document using the Mistral OCR API.

        Args:
            image_limit_per_page (int, optional): limit of extracted images per page. Defaults to 5.
            image_min_size (int, optional): minimum size of extracted images. Defaults to 0.
            adjust_headers_by_toc (bool, optional): adjust headers by the table of contents. Defaults to True.
            annotate_images (bool, optional): whether to annotate images with bounding boxes. Defaults to False.

        Raises:
            requests.exceptions.HTTPError: Error while sending the request to the Mistral OCR API.
            Exception: Error while sending the request to the Mistral OCR API.

        Returns:
            list[str]: pages in markdown format

        """
        assert self.detect_mime_type(filepath) == MimeTypeEnum.PDF, "Unsupported file format"
        assert self.get_pdf_num_pages(filepath) <= max_pages, f"PDF file exceeds the maximum number of pages: {max_pages}"

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
