# Basic fonction to tranform a list of markdown or one markdown into chunks

import re

import tiktoken
from pydantic import BaseModel

from topix.datatypes.file.chunk import Chunk, ChunkProperties
from topix.datatypes.property import TextProperty
from topix.datatypes.resource import RichText


class MarkdownLine(BaseModel):
    """Represents a single line from markdown with metadata."""
    text: str
    token_size: int
    is_title: bool
    page: str


class Chunker:
    def __init__(self, min_chunk_size: int = 700, max_chunk_size: int = 1200):
        self.min_chunk_size = min_chunk_size
        self.max_chunk_size = max_chunk_size
        self.encoding = tiktoken.get_encoding("cl100k_base")

    def _extract_lines_with_metadata(self, markdowns: list[dict]) -> list[MarkdownLine]:
        """Extract each line from markdown with token size, title detection, and page info.

        Args:
            markdowns (list[dict]): A list of markdown strings and their pages. Each dict should have the format:
                {
                    "markdown": str,
                    "page": str
                }
        Returns:
            list[MarkdownLine]: A list of MarkdownLine objects containing text, token size,
                                whether it's a title, and the page number.
        """
        markdown_lines = []

        for md in markdowns:
            markdown_text = md["markdown"]
            page = md["page"]

            # Split markdown into lines
            lines = markdown_text.split("\n")

            for line in lines:
                # Calculate token size
                token_size = len(self.encoding.encode(line))

                # Detect if line is a title (starts with one or more # followed by space)
                is_title = bool(re.match(r"^#{1,6}\s", line))

                # Create MarkdownLine object
                markdown_line = MarkdownLine(
                    text=line,
                    token_size=token_size,
                    is_title=is_title,
                    page=str(page)
                )
                markdown_lines.append(markdown_line)

        return markdown_lines

    def chunk_markdowns(self, markdowns: list[dict]) -> list[Chunk]:
        """Chunk a list of markdown strings or a single markdown string into smaller chunks.

        Args:
            markdowns (list[dict]): A list of markdown strings and their pages. Each dict should have the format:
                {
                    "markdown": str,
                    "page": str
                }
        Returns:
            list[Chunk]: A list of Chunk objects.
        """

        lines = self._extract_lines_with_metadata(markdowns)

        chunks = []
        current_chunk_lines = []
        current_chunk_tokens = 0
        current_chunk_pages = set()

        for i, line in enumerate(lines):
            # Check if adding this line would exceed max_size
            would_exceed_max = current_chunk_tokens + line.token_size > self.max_chunk_size

            # If we would exceed max_size and we have content, finalize current chunk
            if would_exceed_max and current_chunk_lines:
                chunk = self._create_chunk(current_chunk_lines, current_chunk_pages)
                chunks.append(chunk)

                # Start new chunk with current line
                current_chunk_lines = [line]
                current_chunk_tokens = line.token_size
                current_chunk_pages = {line.page}
            else:
                # Add line to current chunk
                current_chunk_lines.append(line)
                current_chunk_tokens += line.token_size
                current_chunk_pages.add(line.page)

                # Check if we should finalize the chunk
                is_last_line = i == len(lines) - 1
                is_between_sizes = self.min_chunk_size <= current_chunk_tokens <= self.max_chunk_size
                next_line_is_title = not is_last_line and lines[i + 1].is_title

                should_finalize = is_between_sizes and (is_last_line or next_line_is_title)

                if should_finalize or (is_last_line and current_chunk_lines):
                    chunk = self._create_chunk(current_chunk_lines, current_chunk_pages)
                    chunks.append(chunk)

                    # Reset for next chunk
                    current_chunk_lines = []
                    current_chunk_tokens = 0
                    current_chunk_pages = set()

        return chunks

    def _create_chunk(self, lines: list[MarkdownLine], pages: set[str]) -> Chunk:
        """Create a Chunk object from a list of MarkdownLine objects.

        Args:
            lines (list[MarkdownLine]): Lines to combine into a chunk
            pages (set[str]): Set of page numbers for this chunk

        Returns:
            Chunk: A Chunk object with the combined content
        """
        # Combine lines into markdown content
        content_text = "\n".join(line.text for line in lines)

        # Sort pages and combine them
        sorted_pages = sorted(pages)
        pages_text = ", ".join(sorted_pages)

        # Create chunk with content and properties
        chunk = Chunk(
            content=RichText(markdown=content_text),
            properties=ChunkProperties(
                pages=TextProperty(text=pages_text)
            )
        )

        return chunk
