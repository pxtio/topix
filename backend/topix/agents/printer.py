"""Printer class for streaming status updates in a console application."""

from typing import Any

from rich.console import Console, Group
from rich.live import Live
from rich.spinner import Spinner


class Printer:
    """Printer class for streaming status updates in a console application."""

    def __init__(self, console: Console) -> None:
        """Init method."""
        self.live = Live(console=console)
        self.items: dict[str, tuple[str, bool]] = {}
        self.hide_done_ids: set[str] = set()
        self.live.start()

    def end(self) -> None:
        """End the live console output."""
        self.live.stop()

    def hide_done_checkmark(self, item_id: str) -> None:
        """Hide the checkmark for a done item."""
        self.hide_done_ids.add(item_id)

    def update_item(
        self,
        item_id: str,
        content: str,
        is_done: bool = False,
        hide_checkmark: bool = False
    ) -> None:
        """Update an item with the given ID, content, and done status."""
        self.items[item_id] = (content, is_done)
        if hide_checkmark:
            self.hide_done_ids.add(item_id)
        self.flush()

    def mark_item_done(self, item_id: str) -> None:
        """Mark an item as done and update its content."""
        self.items[item_id] = (self.items[item_id][0], True)
        self.flush()

    def flush(self) -> None:
        """Render the current state of items to the console."""
        renderables: list[Any] = []
        for item_id, (content, is_done) in self.items.items():
            if is_done:
                prefix = "✅ " if item_id not in self.hide_done_ids else ""
                renderables.append(prefix + content)
            else:
                renderables.append(Spinner("dots", text=content))
        self.live.update(Group(*renderables))
