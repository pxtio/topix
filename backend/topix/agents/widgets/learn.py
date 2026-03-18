"""Widget learning tools."""

from agents import RunContextWrapper

from topix.agents.datatypes.context import Context
from topix.agents.datatypes.tools import AgentToolName, tool_descriptions
from topix.agents.prompt_utils import render_prompt
from topix.agents.tool_handler import ToolHandler


async def learn_generate_html_widget(_wrapper: RunContextWrapper[Context]) -> str:
    """Load guidance for generating HTML widget notes."""
    return render_prompt("widget/learn_generate_html_widget.jinja")


learn_generate_html_widget_tool = ToolHandler.convert_func_to_tool(
    learn_generate_html_widget,
    tool_name=AgentToolName.LEARN_GENERATE_HTML_WIDGET,
    tool_description=tool_descriptions.get(AgentToolName.LEARN_GENERATE_HTML_WIDGET, ""),
)
