"""Primitive create/edit note tools scoped to the current board context."""

from __future__ import annotations

from agents import FunctionTool, RunContextWrapper

from topix.agents.datatypes.context import Context
from topix.agents.datatypes.outputs import CreateNoteOutput, EditNoteOutput
from topix.agents.datatypes.tools import AgentToolName
from topix.agents.notes.service import build_note
from topix.agents.tool_handler import ToolHandler
from topix.datatypes.note.style import NodeType
from topix.store.graph import GraphStore


def _set_required_fields(tool: FunctionTool, required: list[str]) -> FunctionTool:
    """Override the generated schema so optional tool args stay optional."""
    tool.params_json_schema["required"] = required
    return tool


def create_create_note_tool(
    graph_store: GraphStore,
    graph_uid: str,
    root_id: str | None = None,
) -> FunctionTool:
    """Build a create-note tool bound to the current board and optional folder scope."""

    async def create_note(
        _wrapper: RunContextWrapper[Context],
        label: str,
        content: str | None = None,
        note_type: NodeType = NodeType.RECTANGLE,
    ) -> CreateNoteOutput:
        """Create a note in the current board scope.

        Args:
            label (str): Visible title shown on the note.
            content (str | None): Optional markdown body stored inside the note.
            note_type (NodeType): Visual note shape to create, such as rectangle or sheet.

        """
        note = await build_note(
            graph_store=graph_store,
            graph_uid=graph_uid,
            label=label,
            content=content,
            note_type=note_type,
            parent_id=root_id,
        )
        await graph_store.add_notes([note])

        return CreateNoteOutput(
            note_id=note.id,
            graph_uid=graph_uid,
            label=label,
            note_type=note_type,
            parent_id=root_id,
        )

    return _set_required_fields(
        ToolHandler.convert_func_to_tool(
            create_note,
            tool_name=AgentToolName.CREATE_NOTE,
            tool_description=None,
        ),
        ["label"],
    )


def create_edit_note_tool(
    graph_store: GraphStore,
    graph_uid: str,
) -> FunctionTool:
    """Build an edit-note tool bound to the current board scope."""

    async def edit_note(
        _wrapper: RunContextWrapper[Context],
        note_id: str,
        label: str | None = None,
        content: str | None = None,
        note_type: NodeType | None = None,
    ) -> EditNoteOutput:
        """Edit a note already present in the current board scope.

        Args:
            note_id (str): Exact id of the note to update.
            label (str | None): Optional replacement title for the note.
            content (str | None): Optional replacement markdown body for the note.
            note_type (NodeType | None): Optional replacement visual note shape.

        """
        existing_notes = await graph_store.get_nodes([note_id])
        if not existing_notes:
            raise ValueError(f"Note {note_id} was not found.")

        existing_note = existing_notes[0]
        if existing_note.graph_uid != graph_uid:
            raise ValueError("Note does not belong to the current board scope.")

        patch: dict = {}
        if label is not None:
            patch["label"] = {"markdown": label}
        if content is not None:
            patch["content"] = {"markdown": content}
        if note_type is not None:
            patch.setdefault("style", {})["type"] = note_type

        if not patch:
            raise ValueError("Provide at least one field to edit.")

        updated_note = await graph_store.patch_note(note_id, patch)
        if updated_note is None:
            raise ValueError(f"Note {note_id} was not found.")

        return EditNoteOutput(
            note_id=updated_note.id,
            graph_uid=graph_uid,
            label=updated_note.label.markdown if updated_note.label else "",
            note_type=updated_note.style.type,
            parent_id=updated_note.parent_id,
        )

    return _set_required_fields(
        ToolHandler.convert_func_to_tool(
            edit_note,
            tool_name=AgentToolName.EDIT_NOTE,
            tool_description=None,
        ),
        ["note_id"],
    )
