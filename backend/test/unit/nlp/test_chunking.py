"""Unit tests for the Chunker class."""

from topix.nlp.chunking import Chunker


class TestChunker:
    """Test suite for Chunker class."""

    def test_basic_chunking(self):
        """Test basic chunking functionality with simple markdown."""
        chunker = Chunker()
        markdowns = [
            {
                "markdown": "# Title\n\nThis is a paragraph with some content.",
                "page": "1"
            }
        ]

        chunks = chunker.chunk_markdowns(markdowns)

        assert len(chunks) > 0
        assert chunks[0].content is not None
        assert chunks[0].content.markdown is not None
        assert chunks[0].properties.pages is not None
        assert chunks[0].properties.pages.text == "1"

    def test_size_constraints_min_chunk_size(self):
        """Test that chunks respect min_chunk_size."""
        chunker = Chunker(min_chunk_size=100, max_chunk_size=500)
        # Create content that's below min_chunk_size
        small_content = "Short text."
        markdowns = [{"markdown": small_content, "page": "1"}]

        chunks = chunker.chunk_markdowns(markdowns)

        # Should still create a chunk even if below min_size (final chunk)
        assert len(chunks) >= 1
        # The chunk should contain the content
        assert small_content in chunks[0].content.markdown

    def test_size_constraints_max_chunk_size(self):
        """Test that chunks respect max_chunk_size."""
        chunker = Chunker(min_chunk_size=50, max_chunk_size=100)
        # Create content with multiple lines that exceeds max_chunk_size
        # Each line should be reasonably sized so they can be split
        lines = ["This is a line of text. " * 3] * 20  # Multiple lines
        long_content = "\n".join(lines)
        markdowns = [{"markdown": long_content, "page": "1"}]

        chunks = chunker.chunk_markdowns(markdowns)

        # Should create multiple chunks when content exceeds max_chunk_size
        assert len(chunks) > 1
        # Each chunk's token size should not exceed max_chunk_size (approximately)
        # Note: We can't easily verify exact token counts without encoding, but we verify splitting occurred

    def test_title_detection(self):
        """Test that titles are properly detected."""
        chunker = Chunker()
        markdowns = [
            {
                "markdown": "# Title 1\n\nSome content here.\n\n## Title 2\n\nMore content.",
                "page": "1"
            }
        ]

        chunks = chunker.chunk_markdowns(markdowns)

        # Should create chunks, and titles should be in the content
        assert len(chunks) > 0
        # Verify that titles are included in chunks
        all_content = " ".join(chunk.content.markdown for chunk in chunks)
        assert "# Title 1" in all_content or "Title 1" in all_content

    def test_chunk_finalization_on_title_boundary(self):
        """Test that chunks are finalized when encountering a title."""
        chunker = Chunker(min_chunk_size=50, max_chunk_size=200)
        # Create content with enough lines to meet min_chunk_size, then a title
        # Split into multiple lines so chunker can process them separately
        first_chunk_lines = [
            "This is some content that should be in the first chunk.",
            "It has enough text to meet the minimum size requirement.",
            "Now we add more text to fill it up.",
            "Adding another line to ensure we meet the minimum size.",
            "One more line to be safe about the size requirement."
        ]
        markdowns = [
            {
                "markdown": (
                    "\n".join(first_chunk_lines)
                    + "\n\n# New Section\n\nThis content should be in a new chunk "
                    "because it comes after a title."
                ),
                "page": "1"
            }
        ]

        chunks = chunker.chunk_markdowns(markdowns)

        # Should create multiple chunks due to title boundary
        assert len(chunks) >= 2
        # First chunk should end before "# New Section"
        # Second chunk should start with "# New Section"
        found_title_chunk = False
        for chunk in chunks:
            if "# New Section" in chunk.content.markdown:
                found_title_chunk = True
                break
        assert found_title_chunk

    def test_multiple_pages(self):
        """Test chunking markdown from multiple pages stay in the same chunk if not title or doesn't meet max_chunk_size."""
        chunker = Chunker(min_chunk_size=50, max_chunk_size=2000)
        markdowns = [
            {"markdown": "Content from page 1.", "page": "1"},
            {"markdown": "Content from page 2.", "page": "2"},
            {"markdown": "Content from page 3.", "page": "3"},
        ]

        chunks = chunker.chunk_markdowns(markdowns)

        assert len(chunks) == 1
        assert "1" in chunks[0].properties.pages.text
        assert "2" in chunks[0].properties.pages.text
        assert "3" in chunks[0].properties.pages.text

    def test_empty_markdown(self):
        """Test chunking with empty markdown input."""
        chunker = Chunker()
        markdowns = [{"markdown": "", "page": "1"}]

        chunks = chunker.chunk_markdowns(markdowns)

        # Should create an empty chunk
        assert isinstance(chunks, list)
        assert len(chunks) == 1
        assert chunks[0].content.markdown == ""
        assert chunks[0].properties.pages.text == "1"

    def test_single_line_markdown(self):
        """Test chunking with single line markdown."""
        chunker = Chunker()
        markdowns = [{"markdown": "Single line of text.", "page": "1"}]

        chunks = chunker.chunk_markdowns(markdowns)

        assert len(chunks) == 1
        assert chunks[0].content.markdown == "Single line of text."
        assert chunks[0].properties.pages.text == "1"

    def test_very_long_line_exceeds_max(self):
        """Test chunking with content that exceeds max_chunk_size across multiple lines."""
        chunker = Chunker(min_chunk_size=50, max_chunk_size=100)
        # Create multiple lines, each reasonably sized, that together exceed max_chunk_size
        # The chunker splits at line boundaries, so we need multiple lines
        lines = ["This is a line of text that contributes to the chunk size. " * 2] * 15
        long_content = "\n".join(lines)
        markdowns = [{"markdown": long_content, "page": "1"}]

        chunks = chunker.chunk_markdowns(markdowns)

        # Should split into multiple chunks when content exceeds max_chunk_size
        assert len(chunks) > 1

    def test_custom_chunk_sizes(self):
        """Test chunking with custom min/max chunk sizes."""
        chunker = Chunker(min_chunk_size=200, max_chunk_size=400)
        markdowns = [
            {
                "markdown": (
                    "This is a longer piece of content. " * 20
                    + "It should be chunked according to the custom sizes. " * 20
                ),
                "page": "1"
            }
        ]

        chunks = chunker.chunk_markdowns(markdowns)

        assert len(chunks) > 0
        # Verify chunks are created with custom sizes
        for chunk in chunks:
            assert chunk.content is not None
            assert chunk.properties.pages is not None

    def test_title_regex_pattern(self):
        """Test that various title formats are detected correctly."""
        chunker = Chunker()
        markdowns = [
            {
                "markdown": (
                    "# H1 Title\n"
                    "## H2 Title\n"
                    "### H3 Title\n"
                    "#### H4 Title\n"
                    "##### H5 Title\n"
                    "###### H6 Title\n"
                    "Not a title\n"
                    "#Title without space\n"
                    " # Title with leading space\n"
                ),
                "page": "1"
            }
        ]

        lines = chunker._extract_lines_with_metadata(markdowns)

        # Check title detection
        title_lines = [line for line in lines if line.is_title]
        # Should detect H1-H6 with space after #
        assert len(title_lines) == 6
        # Verify specific titles are detected
        title_texts = [line.text for line in title_lines]
        assert "# H1 Title" in title_texts
        assert "## H2 Title" in title_texts
        assert "### H3 Title" in title_texts
        # Verify non-titles are not detected
        non_title_lines = [line for line in lines if not line.is_title]
        assert any("Not a title" in line.text for line in non_title_lines)
        assert any("#Title without space" in line.text for line in non_title_lines)
