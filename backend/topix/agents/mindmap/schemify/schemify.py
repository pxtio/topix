"""Convert a text/conversation to a schema."""
from __future__ import annotations

import random

from agents import ModelSettings, function_tool

from topix.agents.base import BaseAgent
from topix.agents.datatypes.context import Context
from topix.agents.datatypes.model_enum import ModelEnum
from topix.agents.mindmap.schemify.datatypes import SchemaOutput, SNode
from topix.datatypes.note.link import Link
from topix.datatypes.note.note import Note
from topix.datatypes.note.style import NodeType
from topix.datatypes.property import IconProperty, ImageProperty, SizeProperty
from topix.datatypes.resource import RichText
from topix.utils.common import gen_uid
from topix.utils.images.search import fetch_images, search_iconify_icons


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


@function_tool
async def image_search_tool(query: str) -> list[dict]:
    """Search for a neutral, generic image that clarifies one key node or concept.

    Purpose:
        Use this to retrieve at most one image for the entire schema when a single,
        clear picture would improve understanding of the topic.

    When to call:
        - Only after selecting up to one node with type="image".
        - One call per schema maximum.
        - Avoid exploratory retries.

    Input:
        query (str): 4-8 tokens describing the visual subject.
            Examples: "data pipeline", "ai agent", "human review process",
                      "network security", "monitoring dashboard"

    Output:
        list[dict]: Ranked image candidates (best first). Each item typically includes
        a direct or reference URL and may include title, source, or license.

    Selection guidance:
        - Prefer simple, neutral images that convey the main idea clearly.
        - Avoid branding, faces, or text-heavy visuals.
        - Choose generic representations suitable for infographics.

    Failure policy:
        - If no suitable result is returned, do not retry.
        - Leave image_url unset or downgrade the node to a non-image type.
    """
    res = await fetch_images(query=query)
    return res


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
            output_type=SchemaOutput,
            tools=[icon_search_tool, image_search_tool]
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
    note = Note(
        label=RichText(markdown=snode.label),
    )

    if snode.type == "rectangle":
        note.style.type = NodeType.RECTANGLE

    elif snode.type == "ellipse":
        note.style.type = NodeType.ELLIPSE

    elif snode.type == "diamond":
        note.style.type = NodeType.DIAMOND

    elif snode.type == "image" and snode.image_url:
        note.style.type = NodeType.IMAGE
        note.properties.image_url.image = ImageProperty.Image(url=snode.image_url)

    elif snode.type == "icon" and snode.icon_name and ":" in snode.icon_name:
        note.style.type = NodeType.ICON
        note.properties.icon_data.icon = IconProperty.Icon(icon=snode.icon_name)
        note.properties.node_size = SizeProperty(size=SizeProperty.Size(width=150, height=150))

    else:
        note.style.type = NodeType.RECTANGLE  # Default type

    note.properties.node_position.position.x = snode.x * 200 + random.randint(0, 50)
    note.properties.node_position.position.y = snode.y * 150 + random.randint(0, 25)

    return note


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
            ))

    return notes, links
