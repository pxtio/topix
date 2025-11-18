"""Weather Widget Agent tool."""
from agents import RunContextWrapper

from topix.agents.datatypes.context import Context
from topix.agents.datatypes.outputs import DisplayWeatherWidgetOutput
from topix.agents.datatypes.tools import AgentToolName
from topix.agents.tool_handler import ToolHandler


async def display_weather_widget(wrapper: RunContextWrapper[Context], city: str) -> DisplayWeatherWidgetOutput:
    """Create a DisplayWeatherWidgetOutput object.

    Args:
        wrapper (RunContextWrapper[Context]): The reasoning context wrapper for main agent.
        city (str): The city for which to display the weather.

    Returns:
        DisplayWeatherWidgetOutput: The output object for displaying the weather widget.

    """
    return DisplayWeatherWidgetOutput(city=city)


display_weather_widget_tool = ToolHandler.convert_func_to_tool(
    display_weather_widget, tool_name=AgentToolName.DISPLAY_WEATHER_WIDGET
)
