"""Emoji handling for mindmap conversion."""
import re

from src.agents.mindmap.datatypes import SimpleNode

EMOJI_START_RE = re.compile(
    r"^\s*(?P<emoji>("
    r"(?:[\U0001F1E6-\U0001F1FF]{2}\uFE0F?)"                   # flags (pair of regionals) + optional VS16
    r"|"
    r"(?:[\U0001F000-\U0001FAFF\u2300-\u23FF\u2600-\u26FF\u2700-\u27BF]"  # base emoji/symbol ranges
    r"(?:[\U0001F3FB-\U0001F3FF]|\uFE0F){0,2}"                 # optional tone and/or VS16 in any order (0–2)
    r")"
    r"))\s+",
    flags=re.UNICODE
)


def extract_leading_emoji(text: str) -> tuple[str, str]:
    """Extract emoji from text and return tuple [emoji, text]."""
    m = EMOJI_START_RE.match(text or "")
    if m:
        emoji = m.group("emoji")
        return emoji, text[m.end():].strip()
    return "", (text or "").strip()


def annotate_node_emojis(nodes: list[SimpleNode], strip_from_label: bool = True) -> None:
    """Traverse the tree and strip emoji from the label."""
    def visit(n: SimpleNode) -> None:
        emoji, new_label = extract_leading_emoji(n.label)
        n.emoji = emoji
        if strip_from_label and emoji:
            n.label = new_label
        for c in n.children:
            visit(c)

    for root in nodes:
        visit(root)
