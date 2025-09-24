"""Notify Agent."""

from agents import ModelSettings, RunResult
from pydantic import BaseModel

from topix.agents.base import BaseAgent
from topix.agents.datatypes.context import Context
from topix.agents.datatypes.model_enum import ModelEnum
from topix.datatypes.note.link import Link
from topix.datatypes.note.note import Note
from topix.datatypes.note.style import NodeType
from topix.datatypes.resource import RichText


class NotifyOutput(BaseModel):
    """Notify Output."""

    title: str
    content: str


class NotifyAgent(BaseAgent):
    """Notify Agent for synthesizing and thematically analyzing text."""

    def __init__(
        self,
        model: str = ModelEnum.OpenAI.GPT_4O_MINI,
        instructions_template: str = "notify.system.jinja",
        model_settings: ModelSettings | None = None,
    ):
        """Init method."""
        name = "Notify"
        instructions = self._render_prompt(instructions_template)
        if model_settings is None:
            model_settings = ModelSettings(temperature=0.01)

        super().__init__(
            name=name,
            model=model,
            model_settings=model_settings,
            instructions=instructions,
            output_type=NotifyOutput,
        )
        super().__post_init__()

    async def _input_formatter(
        self, context: Context, input: str
    ) -> str:
        """Format the input for the mapify agent.

        Args:
            context (Context): The agent context.
            input (str): The input to format.

        Returns:
            str: The formatted input string.

        """
        # Optionally, you could include chat history if relevant.
        user_prompt = self._render_prompt(
            "notify.user.jinja",
            input=input,
        )
        return user_prompt

    async def _output_extractor(
        self, context: Context, output: RunResult
    ) -> tuple[list[Note], list[Link]]:
        nodes = [
            Note(
                content=RichText(
                    markdown=f"# {output.final_output.title}\n\n{output.final_output.content}".strip(),
                )
            )
        ]
        nodes[0].style.type = NodeType.SHEET

        return nodes, []
