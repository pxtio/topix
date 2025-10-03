"""Utils for web search."""

from datetime import datetime, timedelta

from topix.agents.datatypes.outputs import WebSearchOutput
from topix.agents.datatypes.stream import AgentStreamMessage, Content
from topix.datatypes.recurrence import Recurrence
from topix.utils.web.favicon import fetch_meta_images_batch


async def convert_search_output_to_annotation_message(
    search_output: WebSearchOutput,
    tool_id: str,
    tool_name: str,
) -> AgentStreamMessage | None:
    """Convert search output to annotation message."""
    annotations = []

    search_results = search_output.search_results
    meta_images = await fetch_meta_images_batch(
        [result.url for result in search_results]
    )
    for result in search_results:
        if result.url in meta_images:
            result.favicon = (
                str(meta_images[result.url].favicon)
                if meta_images[result.url].favicon
                else None
            )
            result.cover_image = (
                str(meta_images[result.url].cover_image)
                if meta_images[result.url].cover_image
                else None
            )
    annotations = search_results

    return AgentStreamMessage(
        tool_id=tool_id,
        tool_name=tool_name,
        content=Content(annotations=annotations),
    )


def get_from_date(recency: Recurrence, now: datetime = None) -> datetime:
    """Get the from_date for a given recency.

    Convert current datetime and recency ('daily', 'weekly', 'monthly', 'yearly')
    into a datetime usable as a from_date filter.
    """
    if now is None:
        now = datetime.now()

    today = now.date()

    match recency:
        case Recurrence.DAILY:
            return today - timedelta(days=2)
        case Recurrence.WEEKLY:
            return today - timedelta(days=8)
        case Recurrence.MONTHLY:
            return today - timedelta(days=31)
        case Recurrence.YEARLY:
            return today - timedelta(days=366)
        case _:
            raise ValueError(f"Invalid recency: {recency}. Must be one of 'daily', 'weekly', 'monthly', 'yearly'.")
