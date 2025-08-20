"""Build graph tests."""
from src.agents.mindmap.build_graph_fr_text import split_markdown_sections


def as_sig(secs):
    """Help compact info."""
    return [(s.level, s.title, s.start_line, s.end_line) for s in secs]


def test_preface_then_headings():
    """Preface (level=None) appears if text starts w/o heading; bodies are correct."""
    md = """Prologue before heading.

# H1 Title
intro

## H2 A
a-body

### H3 A1
a1-body

## H2 B
b-body
"""
    secs = split_markdown_sections(md)
    # Signature checks (levels and titles only)
    assert [(s.level, s.title) for s in secs] == [
        (None, ""), (1, "H1 Title"), (2, "H2 A"), (3, "H3 A1"), (2, "H2 B")
    ]
    # Body checks
    assert "Prologue before heading." in secs[0].body
    assert secs[1].body.strip() == "intro"
    assert secs[2].body.strip() == "a-body"
    assert secs[3].body.strip() == "a1-body"
    assert secs[4].body.strip() == "b-body"


def test_headings_inside_code_are_ignored():
    """Headings inside fenced code blocks are not treated as sections."""
    md = """# Top
text
```python
## Not a heading
# Also not a heading
```
## Real
body
"""
    secs = split_markdown_sections(md)
    assert [(s.level, s.title) for s in secs] == [
        (1, "Top"), (2, "Real")
    ]
    assert secs[1].body.strip() == "body"


def test_headings_inside_math_are_ignored():
    """Headings inside $$ … $$ and LaTeX math envs are ignored."""
    md = r"""# Top
$$
## not heading
$$

\begin{equation}
# not heading either
E = mc^2
\end{equation}

## Real
ok
"""
    secs = split_markdown_sections(md)
    assert [(s.level, s.title) for s in secs] == [
        (1, "Top"), (2, "Real")
    ]
    assert secs[1].body.strip() == "ok"


def test_non_overlapping_and_contiguous_ranges():
    """Sections are non-overlapping and cover exactly the doc between starts."""
    md = """# A
line a
## B
line b
## C
line c
"""
    secs = split_markdown_sections(md)
    # Non-overlap: end_line of i == start_line of i+1
    for i in range(len(secs) - 1):
        assert secs[i].end_line == secs[i + 1].start_line
    # Final section ends at doc end
    assert secs[-1].end_line == len(md.splitlines())


def test_empty_doc_returns_empty_list():
    """Empty document -> no sections."""
    assert split_markdown_sections("") == []


def test_no_headings_entire_doc_single_section():
    """No headings -> single section with level=None and empty title."""
    md = "only body\nsecond line"
    secs = split_markdown_sections(md)
    assert len(secs) == 1
    s = secs[0]
    assert s.level is None and s.title == ""
    assert "only body" in s.body and "second line" in s.body


def test_heading_without_body():
    """Heading followed by another heading yields empty body for the first."""
    md = """# A
## B
text
"""
    secs = split_markdown_sections(md)
    assert [(s.level, s.title) for s in secs] == [
        (1, "A"), (2, "B")
    ]
    assert secs[0].body.strip() == ""   # A has no body
    assert secs[1].body.strip() == "text"


def test_clamp_max_heading_level():
    """Headings deeper than max_heading_level are clamped to that level."""
    md = """# H1
###### H6
##### H5
"""
    secs = split_markdown_sections(md, max_heading_level=3)
    # H1 stays 1, others clamped to 3
    assert [s.level for s in secs] == [1, 3, 3]


def test_mixed_fences_code_then_math_then_heading():
    """Complex mixing of fences does not break section detection."""
    md = """```txt
# not heading
```
$$
## not heading
$$
# Real
body
"""
    secs = split_markdown_sections(md)
    assert len(secs) == 2
    assert secs[1].level == 1 and secs[1].title == "Real"
    assert secs[1].body.strip() == "body"
