"""Tests for emoji extraction and annotation."""
from src.agents.mindmap.datatypes import SimpleNode
from src.agents.mindmap.emoji import annotate_node_emojis, extract_leading_emoji


def test_no_emoji_returns_empty_and_stripped():
    """Test no leading emoji -> returns ('', stripped_text)."""
    e, lbl = extract_leading_emoji("  Hello World ")
    assert e == ""
    assert lbl == "Hello World"


def test_simple_emoji_extraction():
    """Test basic emoji at start is extracted and removed from label."""
    e, lbl = extract_leading_emoji("🚀 Launch time")
    assert e == "🚀"
    assert lbl == "Launch time"


def test_variation_selector_emoji():
    """Test emoji with FE0F variation selector is handled (e.g., ☀️)."""
    e, lbl = extract_leading_emoji("☀️ Sunny day")
    assert e == "☀️"
    assert lbl == "Sunny day"


def test_skin_tone_modifier():
    """Test emoji with skin tone modifier is handled (e.g., 👍🏽)."""
    e, lbl = extract_leading_emoji("👍🏽 Great job")
    assert e == "👍🏽"
    assert lbl == "Great job"


def test_flag_sequence():
    """Test flag emoji sequence is handled (e.g., 🇫🇷)."""
    e, lbl = extract_leading_emoji("🇫🇷 Bonjour")
    assert e == "🇫🇷"
    assert lbl == "Bonjour"


def test_symbol_block_emoji():
    """Test symbols like ⏲️ (U+23F2 + FE0F) are handled."""
    e, lbl = extract_leading_emoji("⏲️ Timer started")
    assert e == "⏲️"
    assert lbl == "Timer started"


def test_leading_whitespace_before_emoji():
    """Test leading spaces before emoji are ignored."""
    e, lbl = extract_leading_emoji("   🧠 Memory tricks")
    assert e == "🧠"
    assert lbl == "Memory tricks"


def test_only_emoji_then_spaces():
    """Test label becomes empty if only emoji + spaces exist."""
    e, lbl = extract_leading_emoji("🐍   ")
    assert e == "🐍"
    assert lbl == ""


def test_empty_string_input():
    """Test empty input returns ('', '')."""
    e, lbl = extract_leading_emoji("")
    assert e == ""
    assert lbl == ""


def test_annotate_tree_strips_labels_when_true():
    """Test annotate_node_emojis sets emoji and strips from labels (strip=True)."""
    root = SimpleNode(level=1, label="🚀 Launch plan", note="")
    child = SimpleNode(level=2, label="🧪 Test suite", note="")
    root.children.append(child)

    annotate_node_emojis([root], strip_from_label=True)

    assert root.emoji == "🚀"
    assert root.label == "Launch plan"
    assert child.emoji == "🧪"
    assert child.label == "Test suite"


def test_annotate_tree_keeps_labels_when_false():
    """Test annotate_node_emojis sets emoji but keeps labels (strip=False)."""
    root = SimpleNode(level=1, label="☀️ Solar energy", note="")
    child = SimpleNode(level=2, label="🇺🇸 Policy notes", note="")
    root.children.append(child)

    annotate_node_emojis([root], strip_from_label=False)

    assert root.emoji == "☀️"
    assert root.label == "☀️ Solar energy"
    assert child.emoji == "🇺🇸"
    assert child.label == "🇺🇸 Policy notes"
