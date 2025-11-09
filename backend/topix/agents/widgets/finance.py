"""Finance Widget Agent tool."""

from agents import RunContextWrapper

from topix.agents.datatypes.context import Context
from topix.agents.datatypes.outputs import DisplayStockWidgetOutput
from topix.agents.datatypes.tools import AgentToolName
from topix.agents.tool_handler import ToolHandler


async def display_stock_widget(wrapper: RunContextWrapper[Context], symbol: str) -> DisplayStockWidgetOutput:
    """Create a DisplayStockWidgetOutput object.

    Args:
        wrapper (RunContextWrapper[Context]): The reasoning context wrapper for main agent.
        symbol (str): The stock ticker symbol, e.g. AAPL for Apple Inc.

    Returns:
        DisplayStockWidgetOutput: The output object for displaying the stock widget.

    """
    return DisplayStockWidgetOutput(symbol=symbol)


display_stock_widget_tool = ToolHandler.convert_func_to_tool(
    display_stock_widget, tool_name=AgentToolName.DISPLAY_STOCK_WIDGET
)
