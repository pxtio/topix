# cli_utils.py
"""Reusable CLI utils for rendering multi-step AI agent sessions in the terminal."""
from __future__ import annotations

import json
import sys
import textwrap

from io import StringIO
from typing import Any, Optional, Union

from pydantic import BaseModel, Field
from rich.console import Console, RenderableType
from rich.console import Console as BufferConsole
from rich.markdown import Markdown
from rich.padding import Padding
from rich.panel import Panel
from rich.rule import Rule
from rich.text import Text


class StepRun(BaseModel):
    """One step in a session."""

    idx: int
    title: str
    elapsed: float = 0.0
    timestamp: str = ""
    # Details aggregated into a single markdown string (append token text directly).
    details: str = ""
    # Arbitrary arguments: string or dict (dict pretty-printed as JSON)
    arguments: Optional[Union[str, dict[str, Any]]] = None

    class Config:
        """Config class."""

        extra = "ignore"


class SessionRun(BaseModel):
    """Full session: query, steps, and an optional final answer (markdown)."""

    query: str
    steps: list[StepRun] = Field(default_factory=list)
    answer: Optional[str] = None  # markdown text

    class Config:
        """Config class."""

        extra = "ignore"


# =========================
# Helpers
# =========================

def wrap_paragraph(text: str, width: int, indent: int = 4) -> list[str]:
    """Wrap a paragraph to the given width, with left indent (spaces)."""
    width = max(10, width - indent)
    return [(" " * indent) + line for line in textwrap.wrap(text, width=width)]


def stringify_arguments(args: Union[str, dict[str, Any]]) -> str:
    """Turn `arguments` into a printable string; dicts become pretty JSON."""
    if isinstance(args, str):
        return args
    return json.dumps(args, indent=2, ensure_ascii=False)


# =========================
# Renderer
# =========================

class Renderer:
    """Draw sessions, steps, and streamed answers. Framework-agnostic."""

    def __init__(
        self,
        console: Console,
        *,
        use_alt_screen: bool = True,
        header_title: str = "[bold]AI Agent 👋[/bold]",
        header_char: str = "=",
        header_style: str = "cyan",
        input_caret: str = "▌",
        wrap_margin: int = 4,
        show_hint: bool = True,
    ) -> None:
        """Init method."""
        self.console = console
        self.use_alt_screen = use_alt_screen
        self.header_title = header_title
        self.header_char = header_char
        self.header_style = header_style
        self.input_caret = input_caret
        self.wrap_margin = wrap_margin
        self.show_hint = show_hint
        self._CSI = "\x1b["

    # ---------- ANSI helpers ----------
    def enter_alt_screen(self) -> None:
        """Enter the alternate screen buffer."""
        if self.use_alt_screen:
            sys.stdout.write("\x1b[?1049h")
            sys.stdout.flush()

    def exit_alt_screen(self) -> None:
        """Exit the alternate screen buffer."""
        if self.use_alt_screen:
            sys.stdout.write("\x1b[?1049l")
            sys.stdout.flush()

    def hard_clear_all(self) -> None:
        """Clear the entire terminal screen."""
        sys.stdout.write(f"{self._CSI}3J{self._CSI}2J{self._CSI}H")
        sys.stdout.flush()

    # ---------- building blocks ----------
    @staticmethod
    def _done_step_line(step: StepRun) -> Text:
        t = Text()
        t.append("✔ ", style="green")
        t.append(step.title, style="bold green")
        t.append(f" ({step.elapsed:.2f}s, {step.timestamp})", style="dim")
        return t

    @staticmethod
    def _running_step_line(frame: str, title: str) -> Text:
        t = Text()
        t.append("> ", style="cyan")
        t.append(f"{frame} ", style="cyan")
        t.append(title, style="bold cyan")
        t.append("…", style="cyan")
        return t

    def _render_arguments(self, args: Union[str, dict[str, Any]]) -> list[RenderableType]:
        text = stringify_arguments(args)
        lines = [Text("  Arguments:", style="cyan")]
        lines += [Text((" " * 2) + line) for line in text.splitlines()]
        return lines

    def _render_details_markdown(self, md_text: str) -> RenderableType:
        """Render step details as Markdown with a left indent."""
        # Markdown handles headings, lists, code blocks, etc.
        return Padding(Markdown(md_text, code_theme="ansi_dark"), (0, 0, 0, self.wrap_margin))

    def render_past_session(
        self,
        sess: SessionRun,
        expand_details: bool,
        *,
        show_answer_caret: bool = False,
        caret_char: str = "▌",
    ) -> list[RenderableType]:
        """Render a completed session."""
        out: list[RenderableType] = [Panel(sess.query, title="Query", border_style="blue", expand=False)]
        for st in sess.steps:
            out.append(self._done_step_line(st))
            if expand_details and st.details:
                out.append(self._render_details_markdown(st.details))
            if expand_details and st.arguments is not None:
                out.extend(self._render_arguments(st.arguments))
        if sess.answer:
            out.extend(self._render_answer_block(sess.answer, show_caret=show_answer_caret, caret_char=caret_char))
        return out

    def render_active_session(
        self,
        sess: SessionRun,
        current_idx: int,
        spinner_frame: str,
        show_details: bool,
    ) -> list[RenderableType]:
        """Render an active session, with one step in progress."""
        out: list[RenderableType] = [Panel(sess.query, title="Query", border_style="blue", expand=False)]
        for st in sess.steps:
            if st.idx < current_idx and st.elapsed > 0.0:
                out.append(self._done_step_line(st))
        cur = next(s for s in sess.steps if s.idx == current_idx)
        out.append(self._running_step_line(spinner_frame, cur.title))
        if show_details:
            if cur.details:
                out.append(self._render_details_markdown(cur.details))
            if cur.arguments is not None:
                out.extend(self._render_arguments(cur.arguments))
        return out

    def _render_answer_block(self, answer_text: str, show_caret: bool = False, caret_char: str = "▌") -> list[RenderableType]:
        rule = Rule(title="Answer", style="magenta")
        # Append a caret in a non-invasive way: add a thin dim caret on a new, indented line.
        md = Markdown(answer_text, code_theme="ansi_dark")
        if show_caret:
            caret_line = Text((" " * self.wrap_margin) + caret_char, style="dim")
            return [rule, md, caret_line]
        return [rule, md]

    # ---------- top-level render ----------
    def render_tail(
        self,
        *,
        history: list[SessionRun],
        expand_all: bool,
        input_buffer: str,
        active_sess: Optional[SessionRun] = None,
        current_idx: Optional[int] = None,
        spinner_frame: str = "",
        show_details: bool = False,
        show_input_caret: bool = True,
        answer_caret_for: Optional[SessionRun] = None,
    ) -> None:
        """Render the entire CLI view, showing history and optionally an active session."""
        width = self.console.size.width
        items: list[RenderableType] = []

        items.append(Rule(title=self.header_title, characters=self.header_char, style=self.header_style))

        for sess in history:
            if active_sess is not None and sess is active_sess:
                continue
            items.extend(self.render_past_session(sess, expand_all, show_answer_caret=(sess is answer_caret_for)))
            items.append(Text(""))

        if active_sess is not None and current_idx is not None:
            items.extend(self.render_active_session(active_sess, current_idx, spinner_frame, show_details))
            items.append(Text(""))

        prompt = f"> {input_buffer}{self.input_caret if show_input_caret else ''}"
        items.append(Text(prompt, style="bold"))
        if self.show_hint:
            items.append(Text("Right: expand all · Left: collapse all · Enter: run · Ctrl+C/D: quit", style="dim"))

        height = self.console.size.height
        max_lines = max(1, height - 1)

        buf_io = StringIO()
        buf_console = BufferConsole(file=buf_io, width=width, force_terminal=True, color_system=self.console.color_system)
        for r in items:
            if isinstance(r, Text):
                buf_console.print(r, overflow="crop", no_wrap=True)
            else:
                buf_console.print(r)

        rendered_lines = buf_io.getvalue().splitlines()
        tail = rendered_lines[-max_lines:]

        if self.use_alt_screen:
            self.console.clear()
        else:
            self.hard_clear_all()

        sys.stdout.write("\n".join(tail) + ("\n" if tail else ""))
        sys.stdout.flush()

    # ---------- streaming helpers ----------
    def stream_answer_tick(self, session: SessionRun, next_text: str) -> None:
        """Append the next chunk of text to the session answer."""
        session.answer = (session.answer or "") + next_text
