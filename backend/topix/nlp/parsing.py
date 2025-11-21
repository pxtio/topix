# Take a path (loacal first) and parse it, return a list of markdown blocks / json
"""This module contains the MistralOCRParser class used to parse a PDF document using the Mistral OCR API."""

import base64
import io
import json
import logging
import os
from enum import Enum

import pymupdf
from mistralai import Mistral
from mistralai.extra import response_format_from_pydantic_model
from pydantic import BaseModel, Field

from intextellia.common import gen_uid
from intextellia.datatypes.mime_types import MimeTypeEnum
from intextellia.nlp.llm.document_processing.table_of_content import Toc
from intextellia.parsing.handlers.base import DocumentParser
from intextellia.parsing.handlers.pdf.correct_headers import align_markdown_headers_with_toc
from intextellia.parsing.handlers.pdf.utils import get_pdf_num_pages
from intextellia.parsing.handlers.ppt.utils import get_pptx_num_pages
from intextellia.utils.s3 import S3Handler
from intextellia.utils.stage.stage_utils import AppConfig

logger = logging.getLogger(__name__)


class ImageType(str, Enum):
    """Enum representing the type of image extracted from a document.
    """

    GRAPH = "graph"
    TEXT = "text"
    TABLE = "table"
    IMAGE = "image"


class Image(BaseModel):
    """Represents an image extracted from a document.
    """

    image_type: ImageType = Field(
        ...,
        description="The type of the image. Must be one of 'graph', 'text', 'table' or 'image'.",
    )
    description: str = Field(..., description="A detailed description of the image.")


class MistralOCRParser(DocumentParser):
    """A class used to parse a PDF/PPTX document using the Mistral OCR API.
    """

    def __init__(self, filepath: str):
        self.filepath = filepath
        self.s3 = S3Handler()
        config = AppConfig()
        api_key = config.get_global_config().external_apis.mistral.api_key
        self.client = Mistral(api_key=api_key)
        self.gemini_toc = Toc()

    def detect_mime_type(self) -> MimeTypeEnum:
        """Detect the MIME type of the document.

        Returns:
            MimeTypeEnum: MIME type of the document

        """
        if self.filepath.endswith(".pdf"):
            return MimeTypeEnum.PDF
        elif self.filepath.endswith(".pptx"):
            return MimeTypeEnum.PPTX
        raise ValueError("Unsupported file format")

    def upload_to_s3(self) -> tuple[str, str]:
        """Uploads the PDF file to S3.

        Returns:
            str: public url of the uploaded file

        """
        s3_key = gen_uid()
        url = self.s3.upload(
            filepath=self.filepath,
            bucket="bob-static-content",
            prefix="static/assets",
            mime_type=self.detect_mime_type(),
            key=s3_key,
        )
        return url, s3_key

    def delete_from_s3(self, s3_key: str) -> bool:
        """Delete the PDF file from S3.

        Args:
            s3_key (str): S3 key of the file to delete

        Returns:
            bool: True if the file was deleted successfully, False otherwise

        """
        return self.s3.delete(
            bucket="bob-static-content", prefix="static/assets", key=s3_key
        )

    def handle_image(self, page_md: str, img_data) -> str:
        """Upload the image to S3 and replace the image URL in the page markdown.

        Args:
            page_md (str): page markdown
            img_data : image data which contains image id and image base64

        Returns:
            str: page markdown with the image URL replaced

        """
        img_id = img_data.id
        img_url = img_data.image_base64
        if img_data.image_annotation:
            annotation: dict[str, str] = json.loads(img_data.image_annotation)
        else:
            annotation = {}
        if "description" not in annotation or "image_type" not in annotation:
            description = ""
        else:
            description = f"\n\n(Image Caption: {annotation.get('image_type', '').upper()}: {annotation.get('description', '')})"
        _, base64_data = img_url.split(",", 1)
        image_bytes = base64.b64decode(base64_data)
        file_obj = io.BytesIO(image_bytes)
        url = self.s3.upload(
            file_content=file_obj, mime_type="image/jpeg", key=gen_uid() + ".jpg"
        )
        logger.info(f"Uploading the image with id {img_id} to S3: {url}")
        page_md = page_md.replace(
            f"![{img_id}]({img_id})", f"![{img_id}]({url}){description}"
        )
        return page_md

    def post_process_page(self, page) -> str:
        """Post-process the page data returned by the Mistral OCR API and return a markdown string.

        Args:
            page : page data returned by the Mistral OCR API

        Returns:
            str: page in markdown format

        """
        page_md = page.markdown
        for img_data in page.images:
            page_md = self.handle_image(page_md, img_data)
        return page_md

    def get_num_pages(self) -> int:
        """Get the number of pages in the PDF document.

        Returns:
            int: number of pages in the PDF document

        """
        if self.detect_mime_type() == MimeTypeEnum.PDF:
            return get_pdf_num_pages(self.filepath)
        return get_pptx_num_pages(self.filepath)

    def process_toc(self) -> str | None:
        """Use gemini parser to extract the table of contents from the PDF file."""
        pdf_doc = pymupdf.open(self.filepath)
        toc = pdf_doc.get_toc()
        if not toc:
            logger.info("No table of contents found in the PDF file. Using Gemini parser.")
            toc = self.gemini_toc.process(self.filepath)
            return toc
        return None

    def parse(
        self,
        image_limit_per_page: int = 5,
        image_min_size: int = 0,
        adjust_headers_by_toc: bool = True,
        annotate_images: bool = False,
    ) -> list[str]:
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
        numpages = self.get_num_pages()
        logger.info(f"Number of pages in the PDF file: {numpages}")

        name = os.path.basename(self.filepath)

        doc_url, s3_key = self.upload_to_s3()
        logger.info(f"Uploading the PDF file to S3: {doc_url}")

        # Using multithreading to speed up the process for ocr and gemini
        def run_ocr():
            return self.client.ocr.process(
                model="mistral-ocr-latest",
                document={
                    "type": "document_url",
                    "document_url": doc_url,
                    "document_name": name,
                },
                include_image_base64=True,
                image_limit=min(image_limit_per_page * numpages, 1000),
                image_min_size=image_min_size,
                bbox_annotation_format=response_format_from_pydantic_model(Image)
                if annotate_images
                else None,
            )

        res = run_ocr()

        pages = []
        for page in res.pages:
            pages.append(self.post_process_page(page))

        return pages
