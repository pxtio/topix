"""Image Search Widget in Assistant."""

from topix.agents.datatypes.outputs import DisplayImageSearchWidgetOutput
from topix.agents.datatypes.tools import AgentToolName
from topix.agents.tool_handler import ToolHandler


async def display_image_search_widget(query: str) -> DisplayImageSearchWidgetOutput:
    """Create a DisplayImageSearchWidgetOutput object.

    Args:
        query (str): The search query for finding relevant images to display in the widget.

    Returns:
        DisplayImageSearchWidgetOutput: The output object for displaying the image search widget.

    """
    return DisplayImageSearchWidgetOutput(query=query)


display_image_search_widget_tool = ToolHandler.convert_func_to_tool(
    display_image_search_widget, tool_name=AgentToolName.DISPLAY_IMAGE_SEARCH_WIDGET
)
