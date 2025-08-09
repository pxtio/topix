"""Build a mindmap graph from markdown text with headings."""
import re

from dataclasses import dataclass

from topix.agents.mindmap.datatypes import SimpleNode

HEADING_RE = re.compile(r"^(?P<hashes>#{1,6})\s+(?P<title>.+?)\s*$")
EMOJI_START_RE = re.compile(
    r"^\s*(?P<emoji>[\U0001F300-\U0001FAFF\u2300-\u23FF\u2600-\u27BF])\uFE0F?\s+",
    flags=re.UNICODE,
)


@dataclass
class Block:
    """Represents a markdown block with heading and indices."""

    level: int
    title: str
    start_idx: int
    end_idx: int


def _extract_emoji_and_label(title: str) -> tuple[str, str]:
    """Return (emoji, label). If no emoji at start, emoji='' and label=title."""
    m = EMOJI_START_RE.match(title)
    if m:
        emoji = m.group("emoji")
        label = title[m.end():].strip()
        return emoji, label
    return "", title.strip()


def _split_blocks_with_indices(md: str) -> tuple[list[str], list[Block]]:
    """Split markdown into blocks with indices.

    Scan the markdown and return (lines, blocks), where each Block has
    level, title, start line index of the heading, and end line index (exclusive).
    Headings inside fenced code blocks are ignored.
    """
    lines = md.splitlines()
    blocks: list[Block] = []

    in_code_fence = False
    fence_delim: str | None = None

    # First pass: collect headings with start indices
    for i, line in enumerate(lines):
        # Handle fenced code fences
        fence_match = re.match(r"^(\s*)(`{3,}|~{3,})", line)
        if fence_match:
            delim = fence_match.group(2)
            if not in_code_fence:
                in_code_fence = True
                fence_delim = delim
            elif delim == fence_delim:
                in_code_fence = False
                fence_delim = None
            continue

        if in_code_fence:
            continue

        m = HEADING_RE.match(line)
        if m:
            level = len(m.group("hashes"))
            title = m.group("title").strip()
            blocks.append(Block(level=level, title=title, start_idx=i, end_idx=-1))

    # If no headings, create a synthetic H1 at the top so body is captured
    if not blocks:
        # Treat entire doc as one block starting at line -1 (no heading line)
        blocks.append(Block(level=1, title="Document", start_idx=-1, end_idx=len(lines)))

    # Second pass: assign end indices
    for idx, b in enumerate(blocks):
        if idx + 1 < len(blocks):
            next_start = blocks[idx + 1].start_idx
        else:
            next_start = len(lines)
        b.end_idx = next_start

    return lines, blocks


def parse_markdown_to_mindmap(  # noqa: C901
    md: str,
    max_depth: int = 3,
    parent_intro_only: bool = True
) -> list[SimpleNode]:
    """Parse markdown headings into a SimpleNode tree.

    - Uses H1/H2/H3 by default (clamped to max_depth).
    - Respects fenced code blocks for heading detection.
    - Each node's 'note':
        * If parent_intro_only=True (default): content from the line after the node's heading
          up to the first child heading (intro only).
        * If parent_intro_only=False: intro + trailing content after the last direct child
          up to the next heading at the same or higher level (outro).
    """
    lines, raw_blocks = _split_blocks_with_indices(md)

    # Clamp levels and keep blocks with indices
    blocks: list[Block] = []
    for b in raw_blocks:
        b.level = max(1, min(b.level, max_depth))
        blocks.append(b)

    # Build node list (without hierarchy) and keep indices for later
    nodes: list[SimpleNode] = []
    for b in blocks:
        emoji, label = _extract_emoji_and_label(b.title) if b.title else ("", "Document")
        nodes.append(SimpleNode(emoji=emoji, label=label, note="", children=[]))

    # Determine tree structure using a stack and also track parent-child relationships by index
    parents: list[int | None] = [None] * len(blocks)
    stack: list[tuple[int, int]] = []  # (level, block_index)

    for i, b in enumerate(blocks):
        while stack and stack[-1][0] >= b.level:
            stack.pop()
        parent_idx = stack[-1][1] if stack else None
        parents[i] = parent_idx
        stack.append((b.level, i))

    # For each node, compute intro/outro based on child ranges
    children_map: dict[int, list[int]] = {i: [] for i in range(len(blocks))}
    for i, p in enumerate(parents):
        if p is not None:
            children_map[p].append(i)

    for i, b in enumerate(blocks):
        # Compute intro region
        content_start = (b.start_idx + 1) if b.start_idx >= 0 else 0
        content_end = b.end_idx

        child_idxs = sorted(children_map[i], key=lambda j: blocks[j].start_idx)
        if child_idxs:
            first_child = blocks[child_idxs[0]]
            intro_end = min(first_child.start_idx, content_end)
        else:
            intro_end = content_end

        intro_lines = lines[content_start:intro_end]

        if parent_intro_only:
            note_lines = intro_lines
        else:
            # Add trailing (outro) region after the last child up to content_end
            if child_idxs:
                last_child = blocks[child_idxs[-1]]
                outro_start = last_child.end_idx
                outro_end = content_end
                outro_lines = lines[outro_start:outro_end]
                # Combine intro + blank line (if both non-empty) + outro
                if intro_lines and outro_lines:
                    note_lines = intro_lines + [""] + outro_lines
                else:
                    note_lines = intro_lines + outro_lines
            else:
                note_lines = intro_lines

        nodes[i].note = "\n".join(note_lines).strip()

    # Attach children according to parents map
    roots: list[SimpleNode] = []
    for i, node in enumerate(nodes):
        p = parents[i]
        if p is None:
            roots.append(node)
        else:
            nodes[p].children.append(node)

    return roots
