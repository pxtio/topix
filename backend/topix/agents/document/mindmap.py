"""Agent for creating mindmaps from documents."""
from agents import ModelSettings

from topix.agents.base import BaseAgent
from topix.agents.datatypes.context import Context
from topix.agents.datatypes.model_enum import ModelEnum
from topix.agents.datatypes.outputs import MapifyTheme


class DocumentMindmapAgent(BaseAgent):
    """Agent for creating mindmaps from documents."""

    def __init__(
        self,
        model: str = ModelEnum.OpenAI.GPT_4O_MINI,
        instructions_template: str = "document/document_mindmap.system.jinja",
        model_settings: ModelSettings | None = None,
    ):
        """Initialize the Document Mindmap Agent."""
        name = "Document Mindmap Agent"
        instructions = self._render_prompt(instructions_template)

        if model_settings is None:
            model_settings = ModelSettings(temperature=0.01)

        super().__init__(
            name=name,
            model=model,
            instructions=instructions,
            model_settings=model_settings,
            output_type=MapifyTheme,
        )
        super().__post_init__()

    async def _input_formatter(
        self,
        context: Context,
        document_summary: str,
    ) -> list[dict[str, str]]:
        """Format the input for the document mindmap agent."""
        prompt = self._render_prompt(
            "document/document_mindmap.user.jinja",
            document_summary=document_summary,
        )

        return [{"role": "user", "content": prompt}]
