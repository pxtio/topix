"""Helpers for board-scoped note creation tools."""

from __future__ import annotations

from topix.datatypes.note.note import Note
from topix.datatypes.note.style import FontFamily, NodeType, StrokeStyle, Style, TextAlign
from topix.datatypes.property import PositionProperty, SizeProperty
from topix.datatypes.resource import RichText
from topix.store.graph import GraphStore

DEFAULT_NOTE_GAP = 80
DEFAULT_CHILD_OFFSET_X = 40
DEFAULT_CHILD_OFFSET_Y = 80


def build_default_note_style(note_type: NodeType) -> Style:
    """Return the backend default style for a given note type."""
    style = Style(type=note_type)

    if note_type == NodeType.SHEET:
        style.roughness = 0
        style.roundness = 0
        style.text_align = TextAlign.LEFT
    elif note_type == NodeType.TEXT:
        style.background_color = "#00000000"
        style.text_align = TextAlign.LEFT
    elif note_type == NodeType.SLIDE:
        style.background_color = "#00000000"
        style.stroke_style = StrokeStyle.DASHED
        style.font_family = FontFamily.SANS_SERIF

    return style


def get_default_note_size(note_type: NodeType) -> tuple[int, int]:
    """Mirror the frontend default note sizes for the supported node types."""
    if note_type == NodeType.SHEET:
        return 300, 300
    if note_type == NodeType.TEXT:
        return 150, 20
    if note_type == NodeType.SLIDE:
        return 960, 540
    if note_type == NodeType.FOLDER:
        return 150, 150
    return 50, 50


async def compute_note_position(
    graph_store: GraphStore,
    graph_uid: str,
    parent_id: str | None,
) -> PositionProperty.Position:
    """Choose a simple non-overlapping position for a newly created note."""
    siblings_graph = await graph_store.get_graph(graph_uid, root_id=parent_id) if parent_id else await graph_store.get_graph(graph_uid)
    siblings = [
        note
        for note in (siblings_graph.nodes if siblings_graph else [])
        if note.deleted_at is None
    ]

    if siblings:
        anchor_x = min(note.properties.node_position.position.x for note in siblings)
        max_y = max(
            note.properties.node_position.position.y + note.properties.node_size.size.height
            for note in siblings
        )
        return PositionProperty.Position(x=anchor_x, y=max_y + DEFAULT_NOTE_GAP)

    if parent_id:
        parents = await graph_store.get_nodes([parent_id])
        if parents:
            parent = parents[0]
            parent_position = parent.properties.node_position.position
            parent_size = parent.properties.node_size.size
            return PositionProperty.Position(
                x=parent_position.x + DEFAULT_CHILD_OFFSET_X,
                y=parent_position.y + parent_size.height + DEFAULT_CHILD_OFFSET_Y,
            )

    return PositionProperty.Position(x=0, y=0)


async def build_note(
    graph_store: GraphStore,
    graph_uid: str,
    label: str | None,
    content: str,
    note_type: NodeType,
    parent_id: str | None,
) -> Note:
    """Build a new note with content-first defaults and automatic placement."""
    width, height = get_default_note_size(note_type)
    position = await compute_note_position(
        graph_store=graph_store,
        graph_uid=graph_uid,
        parent_id=parent_id,
    )

    note = Note(
        graph_uid=graph_uid,
        parent_id=parent_id,
        style=build_default_note_style(note_type),
        label=RichText(markdown=label) if label else None,
        content=RichText(markdown=content),
    )
    note.properties.node_position = PositionProperty(position=position)
    note.properties.node_size = SizeProperty(
        size=SizeProperty.Size(width=width, height=height)
    )
    return note
