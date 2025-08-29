"""Text to mindmap converstion functions."""
from __future__ import annotations

import re

from dataclasses import dataclass, field

from topix.agents.mindmap.datatypes import SimpleNode


@dataclass
class Section:
    """Represents a section of markdown text."""

    level: int | None          # 1..6 for headings, None if no heading
    title: str                 # heading text (without hashes), "" if no heading
    start_line: int            # 0-based index of the first line in this section (heading line if present)
    end_line: int              # exclusive end line index
    body: str = field(default="")  # lines after the heading up to (but not including) next section's heading


HEADING_RE = re.compile(r"^(?P<hashes>#{1,6})\s+(?P<title>.+?)\s*$")
FENCE_RE = re.compile(r"^\s*(`{3,}|~{3,})")   # ``` or ~~~
MATH_DOLLAR_FENCE_RE = re.compile(r"^\s*\$\$\s*$")  # $$ on its own line
BEGIN_ENV_RE = re.compile(r"^\s*\\begin\{(?P<env>[A-Za-z*]+)\}")
END_ENV_RE = re.compile(r"^\s*\\end\{(?P<env>[A-Za-z*]+)\}")

# Common LaTeX math-like environments to suppress heading detection inside them
MATH_ENVS = {
    "equation", "equation*", "align", "align*", "gather", "gather*",
    "multline", "multline*", "flalign", "flalign*", "math", "displaymath"
}


def split_markdown_sections(md: str, max_heading_level: int = 6) -> list[Section]:  # noqa: C901
    r"""Split markdown into non-overlapping sections that begin at headings.

    Rules:
      - Detect ATX headings '# ...' with 1..6 hashes followed by a space.
      - Ignore headings inside fenced code blocks (``` / ~~~).
      - Ignore headings inside math fences ($$ ... $$) and common LaTeX math environments
        like \begin{equation} ... \end{equation}.
      - If the document begins with non-heading text, return a leading section with level=None.

    Returns:
      list[Section] in source order. Each section.body excludes the heading line itself.

    """
    lines = md.splitlines()
    n = len(lines)

    in_code_fence = False
    code_delim: str | None = None

    in_math_dollar = False
    math_env_stack: list[str] = []

    sections: list[Section] = []

    # Helper to close previous section and start a new one
    def start_section(at_line: int, level: int | None, title: str) -> None:
        nonlocal sections
        # Close previous
        if sections:
            sections[-1].end_line = at_line
            # fill body for the previous section (excluding its heading line if any)
            body_start = sections[-1].start_line + (1 if sections[-1].level is not None else 0)
            sections[-1].body = "\n".join(lines[body_start:sections[-1].end_line]).rstrip()
        # Start new
        sections.append(Section(level=level, title=title, start_line=at_line, end_line=n))

    # If the very first non-empty thing is not a heading, start an initial body section
    i = 0
    while i < n:
        line = lines[i]
        # Track fences first
        fence_m = FENCE_RE.match(line)
        if fence_m:
            delim = fence_m.group(1)
            if not in_code_fence:
                in_code_fence = True
                code_delim = delim
            elif delim == code_delim:
                in_code_fence = False
                code_delim = None
            i += 1
            continue

        # Math fences $$ ... $$
        if MATH_DOLLAR_FENCE_RE.match(line) and not in_code_fence:
            in_math_dollar = not in_math_dollar
            i += 1
            continue

        # LaTeX environments
        if not in_code_fence and not in_math_dollar:
            m_begin = BEGIN_ENV_RE.match(line)
            if m_begin:
                env = m_begin.group("env")
                if env in MATH_ENVS:
                    math_env_stack.append(env)
                i += 1
                continue
            m_end = END_ENV_RE.match(line)
            if m_end and math_env_stack and m_end.group("env") == math_env_stack[-1]:
                math_env_stack.pop()
                i += 1
                continue

        # Heading detection only when not inside any fence/env
        if not in_code_fence and not in_math_dollar and not math_env_stack:
            m = HEADING_RE.match(line)
            if m:
                level = min(len(m.group("hashes")), max_heading_level)
                title = m.group("title").strip()
                start_section(i, level, title)
                i += 1
                break

        # Not a heading and not inside code/math -> keep scanning
        if line.strip():
            # First content is non-heading: start a preface section
            start_section(i, None, "")
            i += 1
            break

        i += 1

    # If nothing started yet, the whole file is empty
    if not sections:
        return []

    # Continue scanning after the first section start point
    while i < n:
        line = lines[i]

        # Handle code fences
        fence_m = FENCE_RE.match(line)
        if fence_m:
            delim = fence_m.group(1)
            if not in_code_fence:
                in_code_fence = True
                code_delim = delim
            elif delim == code_delim:
                in_code_fence = False
                code_delim = None
            i += 1
            continue

        # Handle math fences
        if MATH_DOLLAR_FENCE_RE.match(line) and not in_code_fence:
            in_math_dollar = not in_math_dollar
            i += 1
            continue

        # Handle LaTeX math environments
        if not in_code_fence and not in_math_dollar:
            m_begin = BEGIN_ENV_RE.match(line)
            if m_begin:
                env = m_begin.group("env")
                if env in MATH_ENVS:
                    math_env_stack.append(env)
                i += 1
                continue
            m_end = END_ENV_RE.match(line)
            if m_end and math_env_stack and m_end.group("env") == math_env_stack[-1]:
                math_env_stack.pop()
                i += 1
                continue

        # Detect a new heading (only outside fences/envs)
        if not in_code_fence and not in_math_dollar and not math_env_stack:
            m = HEADING_RE.match(line)
            if m:
                level = min(len(m.group("hashes")), max_heading_level)
                title = m.group("title").strip()
                start_section(i, level, title)
                i += 1
                continue

        i += 1

    # Close the final section body
    if sections:
        sec = sections[-1]
        sec.end_line = n
        body_start = sec.start_line + (1 if sec.level is not None else 0)
        sec.body = "\n".join(lines[body_start:sec.end_line]).rstrip()

    return sections


def sections_to_tree(sections: list[Section], label_words: int = 5) -> list[SimpleNode]:
    """Build a hierarchical tree from flat sections using a stack."""
    roots: list[SimpleNode] = []
    stack: list[SimpleNode] = []

    for s in sections:
        level = 0 if s.level is None else s.level
        if level == 0:
            label = " ".join(s.body.split()[:label_words]) + "..."
        else:
            label = s.title
        node = SimpleNode(level=level, label=label, note=s.body, children=[])

        # Pop until parent has strictly lower level
        while stack and stack[-1].level >= level:
            stack.pop()

        if stack:
            stack[-1].children.append(node)
        else:
            roots.append(node)

        stack.append(node)

    return roots
