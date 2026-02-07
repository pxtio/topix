"""Convert a text/conversation to a schema."""
from __future__ import annotations

from agents import ModelSettings, function_tool

from topix.agents.base import BaseAgent
from topix.agents.datatypes.context import Context
from topix.agents.datatypes.model_enum import ModelEnum
from topix.agents.mindmap.schemify.datatypes import SchemaOutput, SNode
from topix.datatypes.note.link import Link
from topix.datatypes.note.note import Note
from topix.datatypes.resource import RichText
from topix.utils.common import gen_uid
from topix.utils.images.search import search_iconify_icons


@function_tool
async def icon_search_tool(query: str) -> list[dict]:
    """Search for a simple, symbolic icon that represents one concrete node concept.

    Purpose
    - Fetch at most two icons per schema for distinct, high-salience, concrete nodes
      (e.g., database, cloud, api, user, robot, alert, monitor, storage).
    - Not for abstract ideas or processes.

    Call Policy
    - Use only after choosing up to two nodes to receive icons.
    - One call per selected node. Maximum two total calls per schema.
    - No exploratory retries or query variations.

    Input (query)
    - Prefer a **single, generic noun** (1 word). Keep it simple.
      Examples: "database", "cloud", "user", "robot", "alert", "monitor", "storage",
                "server", "queue", "lock", "key", "document", "chart", "model", "api".
    - If a single word is too ambiguous, use **two words max**, still generic (no brands).
      Examples: "data pipeline" -> "pipeline"; "cryptocurrency coin" -> "coin";
                "monitoring dashboard" -> "dashboard"; "cloud api" -> "cloud".
    - Strip adjectives and marketing terms; prefer singular nouns.

    Output
    - list[dict]: ranked icon candidates (best first). Items typically include:
      - a stable name/identifier (use this to set `icon_name`)
      - a preview/reference URL
      - optional tags/metadata

    Selection Guidance
    - Prefer clear, generic pictograms that read well at small sizes.
    - Avoid branded, text-based, or highly detailed graphics.
    - If several fit, choose the top suitable result.

    Provenance Rule
    - `icon_name` must be taken **directly** from the selected search result
      (e.g., result name/identifier). Do not invent or guess values.

    Failure Policy
    - If no suitable result is returned, do not retry with new queries.
    - Leave the node's `icon_name` unset (null) or downgrade the node to a non-icon shape.

    Query Reduction Examples (for the caller's convenience)
    - "cryptocurrency coin" -> "coin"
    - "cloud api service" -> "cloud"
    - "user account profile" -> "user"
    - "network security shield" -> "shield"
    - "database storage engine" -> "database"
    """
    res = await search_iconify_icons(query=query)
    return [icon.model_dump() for icon in res]


class SchemifyAgent(BaseAgent):
    """Schemify Agent for synthesizing and thematically analyzing text."""

    def __init__(
        self,
        model: str = ModelEnum.OpenAI.GPT_4_1,
        instructions_template: str = "schemify/schemify.system.jinja",
        model_settings: ModelSettings | None = None,
    ):
        """Init method."""
        name = "Schemify"
        instructions = self._render_prompt(instructions_template)
        if model_settings is None:
            model_settings = ModelSettings(temperature=0.01)

        super().__init__(
            name=name,
            model=model,
            model_settings=model_settings,
            instructions=instructions,
            output_type=SchemaOutput
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
            "schemify/schemify.user.jinja",
            input_text=input,
        )
        return user_prompt


def _convert_snode_to_note(snode: SNode) -> Note:
    """Convert SNode to Note."""
    return Note(
        label=RichText(markdown=snode.label),
    )


def convert_schemify_output_to_notes_links(
    output: SchemaOutput,
) -> tuple[list[Note], list[Link]]:
    """Convert SchemaOutput output to notes and links."""
    notes = []
    links = []

    id_to_note = {}

    for snode in output.nodes:
        if snode.id in id_to_note:
            continue  # avoid duplicates
        note = _convert_snode_to_note(snode)
        note.id = gen_uid()
        notes.append(note)
        id_to_note[snode.id] = note

    for link in output.edges:
        if link.source in id_to_note and link.target in id_to_note:
            links.append(Link(
                source=id_to_note[link.source].id,
                target=id_to_note[link.target].id,
                label=RichText(markdown=link.label) if link.label else None,
            ))

    return notes, links
