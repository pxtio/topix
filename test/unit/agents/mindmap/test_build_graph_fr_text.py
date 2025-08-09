"""Tests for mindmap parsing."""
from topix.agents.mindmap.build_graph_fr_text import parse_markdown_to_mindmap
from topix.agents.mindmap.datatypes import SimpleNode


def _find(node: SimpleNode, label: str) -> SimpleNode | None:
    if node.label == label:
        return node
    for c in node.children:
        hit = _find(c, label)
        if hit:
            return hit
    return None


def test_single_h1_root_and_note():
    """Test single H1 heading with intro note and no children."""
    md = """# 🧠 Root Heading Carries Key Info

This is an intro paragraph for the root.
"""
    root = parse_markdown_to_mindmap(md)[0]
    assert root.label == "Root Heading Carries Key Info"
    assert root.emoji == "🧠"
    assert "intro paragraph" in root.note
    assert root.children == []


def test_h2_children_and_order():
    """Test parsing multiple H2 children under a single H1."""
    md = """# 🧠 Root

Intro.

## 🔕 First child summary
First child intro.

## ⏲️ Second child summary
Second child intro.
"""
    root = parse_markdown_to_mindmap(md)[0]
    assert len(root.children) == 2
    assert root.children[0].label == "First child summary"
    assert root.children[1].label == "Second child summary"


def test_emoji_optional_and_label_trim():
    """Test handling headings with and without emojis."""
    md = """# Root Without Emoji

## 🧩 Has Emoji
text

## No Emoji Either
more
"""
    root = parse_markdown_to_mindmap(md)[0]
    assert root.emoji == ""
    first = _find(root, "Has Emoji")
    second = _find(root, "No Emoji Either")
    assert first and first.emoji == "🧩"
    assert second and second.emoji == ""


def test_code_fence_headings_are_ignored():
    """Test ignoring headings inside fenced code blocks."""
    md = """# 🧠 Root

```markdown
## This is not a real heading
# Nor is this one
```

## ✅ Real Child
text
"""
    root = parse_markdown_to_mindmap(md)[0]
    child = _find(root, "Real Child")
    assert child is not None
    assert _find(root, "This is not a real heading") is None
    assert _find(root, "Nor is this one") is None


def test_multiple_h1_creates_synthetic_document_root():
    """Test that multiple H1s result in multiple roots returned."""
    md = """# One
text 1

# Two
text 2
"""
    roots = parse_markdown_to_mindmap(md)
    labels = [r.label for r in roots]
    assert "One" in labels and "Two" in labels


def test_math_and_code_preserved_in_notes():
    """Test that math and code blocks are preserved in notes."""
    md = r"""# 🧠 Root

\[
E = mc^2
\]

```python
def f(x):
    return x**2
```

## Child
Text
"""
    root = parse_markdown_to_mindmap(md)[0]
    assert r"E = mc^2" in root.note
    assert "def f(x):" in root.note


def test_child_order_by_source_position():
    """Test that children keep the source order, not alphabetical order."""
    md = """# Root
txt
## B child second in source
txt
## A child first in source
txt
"""
    root = parse_markdown_to_mindmap(md)[0]
    labels = [c.label for c in root.children]
    assert labels == ["B child second in source", "A child first in source"]
