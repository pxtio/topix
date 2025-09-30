"""Utils for web search."""

from topix.agents.datatypes.outputs import WebSearchOutput
from topix.agents.datatypes.stream import AgentStreamMessage, Content
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
