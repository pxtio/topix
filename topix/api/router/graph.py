"""Graph API Router."""

from typing import Annotated

from fastapi import APIRouter, Request
from fastapi.params import Body, Path, Query

from topix.api.datatypes.requests import AddLinksRequest, AddNotesRequest, GraphUpdateRequest
from topix.api.helpers import format_response
from topix.datatypes.graph.graph import Graph
from topix.store.graph import GraphStore

router = APIRouter(
    prefix="/boards",
    tags=["boards"],
    responses={404: {"description": "Not found"}},
)


@router.put("/", include_in_schema=False)
@router.put("")
async def create_graph(
    request: Request,
    user_id: Annotated[str, Query(description="User Unique ID")]
):
    """Create a new graph for the user."""
    store: GraphStore = request.app.graph_store

    async def create_graph():
        """Create a new graph in the store."""
        new_graph = Graph(user_uid=user_id)
        await store.add_graph(graph=new_graph, user_uid=user_id)
        return {"graph_id": new_graph.uid}

    return await format_response(create_graph)


@router.post("/{graph_id}/", include_in_schema=False)
@router.post("/{graph_id}")
async def update_graph(
    request: Request,
    graph_id: Annotated[str, Path(description="Graph ID")],
    user_id: Annotated[str, Query(description="User Unique ID")],
    body: Annotated[GraphUpdateRequest, Body(description="Graph update data")]
):
    """Update an existing graph by its ID."""
    store: GraphStore = request.app.graph_store
    return await format_response(store.update_graph, graph_id, body.data)


@router.delete("/{graph_id}/", include_in_schema=False)
@router.delete("/{graph_id}")
async def delete_graph(
    request: Request,
    graph_id: Annotated[str, Path(description="Graph ID")],
    user_id: Annotated[str, Query(description="User Unique ID")]
):
    """Delete a graph by its ID."""
    store: GraphStore = request.app.graph_store

    async def delete_graph():
        """Delete the graph from the store."""
        await store.delete_graph(graph_uid=graph_id, hard_delete=True)
        return {"message": "Graph deleted successfully"}

    return await format_response(delete_graph)


@router.get("/{graph_id}/", include_in_schema=False)
@router.get("/{graph_id}")
async def get_graph(
    request: Request,
    graph_id: Annotated[str, Path(description="Graph ID")],
    user_id: Annotated[str, Query(description="User Unique ID")]
):
    """Get a graph by its ID."""
    store: GraphStore = request.app.graph_store

    async def get_graph():
        """Retrieve the graph from the store."""
        graph = await store.get_graph(graph_uid=graph_id)
        return graph.model_dump(exclude_none=True)

    return await format_response(get_graph)


@router.get("/", include_in_schema=False)
@router.get("")
async def list_graphs(
    request: Request,
    user_id: Annotated[str, Query(description="User Unique ID")]
):
    """List all graphs for the user."""
    store: GraphStore = request.app.graph_store

    async def list_graphs():
        """List all graphs for the user."""
        graphs = await store.list_graphs(user_uid=user_id)
        return {"graphs": [{"id": idx, "label": label} for idx, label in graphs]}

    return await format_response(list_graphs)


@router.post("/{graph_id}/notes/", include_in_schema=False)
@router.post("/{graph_id}/notes")
async def add_notes_to_graph(
    request: Request,
    graph_id: Annotated[str, Path(description="Graph ID")],
    user_id: Annotated[str, Query(description="User Unique ID")],
    body: Annotated[AddNotesRequest, Body(description="Notes to add")]
):
    """Add notes to a graph."""
    store: GraphStore = request.app.graph_store

    async def add_notes():
        """Add notes to the specified graph."""
        await store.add_notes(nodes=body.notes)
        return {"message": "Notes added to graph successfully"}

    return await format_response(add_notes)


@router.delete("/{graph_id}/notes/{note_id}/", include_in_schema=False)
@router.delete("/{graph_id}/notes/{note_id}")
async def remove_note_from_graph(
    request: Request,
    graph_id: Annotated[str, Path(description="Graph ID")],
    note_id: Annotated[str, Path(description="Note ID")],
    user_id: Annotated[str, Query(description="User Unique ID")],
):
    """Remove notes from a graph."""
    store: GraphStore = request.app.graph_store

    async def remove_note():
        """Remove notes from the specified graph."""
        await store.delete_node(node_id=note_id)
        return {"message": "Note removed from graph successfully"}

    return await format_response(remove_note)


@router.post("/{graph_id}/links/", include_in_schema=False)
@router.post("/{graph_id}/links")
async def add_links_to_graph(
    request: Request,
    graph_id: Annotated[str, Path(description="Graph ID")],
    user_id: Annotated[str, Query(description="User Unique ID")],
    body: Annotated[AddLinksRequest, Body(description="Links to add")]
):
    """Add links to a graph."""
    store: GraphStore = request.app.graph_store

    async def add_links():
        """Add links to the specified graph."""
        await store.add_links(links=body.links)
        return {"message": "Links added to graph successfully"}

    return await format_response(add_links)


@router.delete("/{graph_id}/links/{link_id}/", include_in_schema=False)
@router.delete("/{graph_id}/links/{link_id}")
async def remove_link_from_graph(
    request: Request,
    graph_id: Annotated[str, Path(description="Graph ID")],
    link_id: Annotated[str, Path(description="Link ID")],
    user_id: Annotated[str, Query(description="User Unique ID")],
):
    """Remove links from a graph."""
    store: GraphStore = request.app.graph_store

    async def remove_link():
        """Remove links from the specified graph."""
        await store.delete_link(link_id=link_id)
        return {"message": "Link removed from graph successfully"}

    return await format_response(remove_link)
