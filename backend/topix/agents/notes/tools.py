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


def create_create_note_tool(
    graph_store: GraphStore,
    graph_uid: str,
    root_id: str | None = None,
) -> FunctionTool:
    """Build a create-note tool bound to the current board and optional folder scope."""

    async def create_note(
        _wrapper: RunContextWrapper[Context],
        content: str,
        label: str | None = None,
        note_type: NodeType = NodeType.RECTANGLE,
    ) -> CreateNoteOutput:
        """Create a note in the current board scope.

        Write short, concise note content, ideally a single paragraph. Content may use
        simple markdown such as bold, italic, underline, lists, or links to highlight
        important keywords or short phrases, but avoid headings.
        If the user explicitly asks for a code note, runnable Python snippet, sandbox,
        or executable code node, create a `code-sandbox` note and put the Python code
        in `content` instead of creating a normal text note.

        Args:
            content (str): Main markdown body of the note. This is the most important text.
            label (str | None): Optional short title stored separately from the main body.
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

    return ToolHandler.convert_func_to_tool(
        create_note,
        tool_name=AgentToolName.CREATE_NOTE,
        tool_description=None,
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

        Keep note content short and concise, ideally a single paragraph. Content may use
        simple markdown such as bold, italic, underline, lists, or links to highlight
        important keywords or short phrases, but avoid headings.
        If the user explicitly wants the note to become a code note, runnable Python
        snippet, sandbox, or executable code node, set `note_type` to `code-sandbox`
        and store the Python code in `content`.

        Args:
            note_id (str): Exact id of the note to update.
            content (str | None): Optional replacement markdown body. This is the main note text.
            label (str | None): Optional replacement short title stored separately from the body.
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
            label=updated_note.label.markdown if updated_note.label else None,
            note_type=updated_note.style.type,
            parent_id=updated_note.parent_id,
        )

    return ToolHandler.convert_func_to_tool(
        edit_note,
        tool_name=AgentToolName.EDIT_NOTE,
        tool_description=None,
    )
