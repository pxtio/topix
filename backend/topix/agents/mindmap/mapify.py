"""Mapify Agent."""

from agents import ModelSettings, RunResult
from pydantic import BaseModel

from topix.agents.base import BaseAgent
from topix.agents.datatypes.context import Context
from topix.agents.datatypes.model_enum import ModelEnum
from topix.datatypes.graph.style import NodeType
from topix.datatypes.note.link import Link
from topix.datatypes.note.note import Note
from topix.datatypes.resource import RichText


class Theme(BaseModel):
    """Theme."""

    title: str
    content: str


class MapifyOutput(BaseModel):
    """Mapify Output."""

    title: str
    content: str
    themes: list[Theme]


class MapifyAgent(BaseAgent):
    """Mapify Agent for synthesizing and thematically analyzing text."""

    def __init__(
        self,
        model: str = ModelEnum.OpenAI.GPT_4O_MINI,
        instructions_template: str = "mapify.system.jinja",
        model_settings: ModelSettings | None = None,
    ):
        """Init method."""
        name = "Mapify"
        instructions = self._render_prompt(instructions_template)
        if model_settings is None:
            model_settings = ModelSettings(temperature=0.01)

        super().__init__(
            name=name,
            model=model,
            model_settings=model_settings,
            instructions=instructions,
            output_type=MapifyOutput,
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
            "mapify.user.jinja",
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
        ] + [
            Note(
                content=RichText(
                    markdown=theme.content,
                ),
                label=RichText(
                    markdown=theme.title,
                )
            ) for theme in output.final_output.themes
        ]

        nodes[0].style.type = NodeType.SHEET
        for node in nodes[1:]:
            node.style.type = NodeType.RECTANGLE

        links = [
            Link(
                source=nodes[0].id,
                target=node.id
            ) for node in nodes[1:]
        ]
        return nodes, links
