"""Agent for summarizing documents."""

from agents import ModelSettings

from topix.agents.base import BaseAgent
from topix.agents.datatypes.context import Context
from topix.agents.datatypes.model_enum import ModelEnum


class DocumentSummaryAgent(BaseAgent):
    """Agent for summarizing documents."""

    def __init__(
        self,
        model: str = ModelEnum.OpenAI.GPT_4O_MINI,
        instructions_template: str = "document/document_summary.system.jinja",
        model_settings: ModelSettings | None = None,
    ):
        """Initialize the Document Summary Agent."""
        name = "Document Summary Agent"
        instructions = self._render_prompt(instructions_template)

        if model_settings is None:
            model_settings = ModelSettings(temperature=0.01)

        super().__init__(
            name=name,
            model=model,
            instructions=instructions,
            model_settings=model_settings,
        )
        super().__post_init__()

    async def _input_formatter(
        self,
        context: Context,
        document_text: str,
    ) -> list[dict[str, str]]:
        """Format the input for the document summary agent."""
        prompt = self._render_prompt(
            "document/document_summary.user.jinja",
            document_text=document_text,
        )

        return [{"role": "user", "content": prompt}]
