"""Mapify Agent."""

from __future__ import annotations

from agents import ModelSettings, RunResult
from pydantic import BaseModel

from topix.agents.base import BaseAgent
from topix.agents.datatypes.context import Context
from topix.agents.datatypes.model_enum import ModelEnum
from topix.datatypes.note.style import NodeType
from topix.datatypes.note.link import Link
from topix.datatypes.note.note import Note
from topix.datatypes.resource import RichText


class Theme(BaseModel):
    """Theme."""

    label: str
    description: str
    subthemes: list[Theme] = []


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
            output_type=Theme,
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
        notes = []
        links = []

        def _recursive_theme_to_note(
            theme: Theme,
            parent: Note | None = None,
        ) -> Note:
            note = Note(
                label=RichText(markdown=f"{theme.label} - {theme.description}"),
            )
            note.style.type = NodeType.RECTANGLE
            notes.append(note)

            if parent:
                link = Link(
                    source=parent.id,
                    target=note.id,
                )
                links.append(link)

            for subtheme in theme.subthemes:
                _recursive_theme_to_note(subtheme, parent=note)

            return note
        theme = output.final_output
        _recursive_theme_to_note(theme)

        return notes, links
