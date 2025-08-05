"""Graph API Router."""

from typing import Annotated

from fastapi import APIRouter, HTTPException, Request, Response
from fastapi.params import Body, Path, Query

from topix.api.datatypes.requests import AddLinksRequest, AddNotesRequest, GraphUpdateRequest, LinkUpdateRequest, NoteUpdateRequest
from topix.api.helpers import with_standard_response
from topix.datatypes.graph.graph import Graph
from topix.store.graph import GraphStore

router = APIRouter(
    prefix="/boards",
    tags=["boards"],
    responses={404: {"description": "Not found"}},
)


@router.put("/", include_in_schema=False)
@router.put("")
@with_standard_response
async def create_graph(
    response: Response,
    request: Request,
    user_id: Annotated[str, Query(description="User Unique ID")]
):
    """Create a new graph for the user."""
    store: GraphStore = request.app.graph_store

    new_graph = Graph(user_uid=user_id)
    await store.add_graph(graph=new_graph, user_uid=user_id)
    return {"graph_id": new_graph.uid}


@router.post("/{graph_id}/", include_in_schema=False)
@router.post("/{graph_id}")
@with_standard_response
async def update_graph(
    response: Response,
    request: Request,
    graph_id: Annotated[str, Path(description="Graph ID")],
    user_id: Annotated[str, Query(description="User Unique ID")],
    body: Annotated[GraphUpdateRequest, Body(description="Graph update data")]
):
    """Update an existing graph by its ID."""
    store: GraphStore = request.app.graph_store
    return await store.update_graph(graph_uid=graph_id, data=body.data)


@router.delete("/{graph_id}/", include_in_schema=False)
@router.delete("/{graph_id}")
@with_standard_response
async def delete_graph(
    response: Response,
    request: Request,
    graph_id: Annotated[str, Path(description="Graph ID")],
    user_id: Annotated[str, Query(description="User Unique ID")]
):
    """Delete a graph by its ID."""
    store: GraphStore = request.app.graph_store

    await store.delete_graph(graph_uid=graph_id, hard_delete=True)
    return {"message": "Board deleted successfully"}


@router.get("/{graph_id}/", include_in_schema=False)
@router.get("/{graph_id}")
@with_standard_response
async def get_graph(
    response: Response,
    request: Request,
    graph_id: Annotated[str, Path(description="Graph ID")],
    user_id: Annotated[str, Query(description="User Unique ID")]
):
    """Get a graph by its ID."""
    store: GraphStore = request.app.graph_store

    graph = await store.get_graph(graph_uid=graph_id)
    if not graph:
        raise HTTPException(status_code=404, detail="Graph not found")

    return {"graph": graph.model_dump(exclude_none=True)}


@router.get("/", include_in_schema=False)
@router.get("")
@with_standard_response
async def list_graphs(
    response: Response,
    request: Request,
    user_id: Annotated[str, Query(description="User Unique ID")]
):
    """List all graphs for the user."""
    store: GraphStore = request.app.graph_store

    graphs = await store.list_graphs(user_uid=user_id)
    return {"graphs": [{"id": idx, "label": label} if label else {"id": idx} for idx, label in graphs]}


@router.post("/{graph_id}/notes/", include_in_schema=False)
@router.post("/{graph_id}/notes")
@with_standard_response
async def add_notes_to_graph(
    response: Response,
    request: Request,
    graph_id: Annotated[str, Path(description="Graph ID")],
    user_id: Annotated[str, Query(description="User Unique ID")],
    body: Annotated[AddNotesRequest, Body(description="Notes to add")]
):
    """Add notes to a graph."""
    store: GraphStore = request.app.graph_store

    notes = body.notes
    for note in notes:
        note.graph_uid = graph_id

    await store.add_notes(nodes=notes)
    return {"message": "Notes added to board successfully"}


@router.patch("/{graph_id}/notes/{note_id}/", include_in_schema=False)
@router.patch("/{graph_id}/notes/{note_id}")
@with_standard_response
async def update_note(
    response: Response,
    request: Request,
    graph_id: Annotated[str, Path(description="Graph ID")],
    note_id: Annotated[str, Path(description="Note ID")],
    user_id: Annotated[str, Query(description="User Unique ID")],
    body: Annotated[NoteUpdateRequest, Body(description="Note update data")]
):
    """Update a note in a graph."""
    store: GraphStore = request.app.graph_store

    await store.update_node(node_id=note_id, data=body.data)
    return {"message": "Note updated successfully"}


@router.delete("/{graph_id}/notes/{note_id}/", include_in_schema=False)
@router.delete("/{graph_id}/notes/{note_id}")
@with_standard_response
async def remove_note_from_graph(
    response: Response,
    request: Request,
    graph_id: Annotated[str, Path(description="Graph ID")],
    note_id: Annotated[str, Path(description="Note ID")],
    user_id: Annotated[str, Query(description="User Unique ID")],
):
    """Remove notes from a graph."""
    store: GraphStore = request.app.graph_store

    await store.delete_node(node_id=note_id)
    return {"message": "Note removed from board successfully"}


@router.post("/{graph_id}/links/", include_in_schema=False)
@router.post("/{graph_id}/links")
@with_standard_response
async def add_links_to_graph(
    response: Response,
    request: Request,
    graph_id: Annotated[str, Path(description="Graph ID")],
    user_id: Annotated[str, Query(description="User Unique ID")],
    body: Annotated[AddLinksRequest, Body(description="Links to add")]
):
    """Add links to a graph."""
    store: GraphStore = request.app.graph_store

    links = body.links
    for link in links:
        link.graph_uid = graph_id

    await store.add_links(links=links)
    return {"message": "Links added to board successfully"}


@router.patch("/{graph_id}/links/{link_id}/", include_in_schema=False)
@router.patch("/{graph_id}/links/{link_id}")
@with_standard_response
async def update_link(
    response: Response,
    request: Request,
    graph_id: Annotated[str, Path(description="Graph ID")],
    link_id: Annotated[str, Path(description="Link ID")],
    user_id: Annotated[str, Query(description="User Unique ID")],
    body: Annotated[LinkUpdateRequest, Body(description="Link update data")]
):
    """Update a link in a graph."""
    store: GraphStore = request.app.graph_store

    await store.update_link(link_id=link_id, data=body.data)
    return {"message": "Link updated successfully"}


@router.delete("/{graph_id}/links/{link_id}/", include_in_schema=False)
@router.delete("/{graph_id}/links/{link_id}")
@with_standard_response
async def remove_link_from_graph(
    response: Response,
    request: Request,
    graph_id: Annotated[str, Path(description="Graph ID")],
    link_id: Annotated[str, Path(description="Link ID")],
    user_id: Annotated[str, Query(description="User Unique ID")],
):
    """Remove links from a graph."""
    store: GraphStore = request.app.graph_store

    await store.delete_link(link_id=link_id)
    return {"message": "Link removed from board successfully"}
