"""Graph API Router."""

from typing import Annotated

from fastapi import APIRouter, Request
from fastapi.params import Path, Query

router = APIRouter(
    prefix="/graph",
    tags=["graph"],
    responses={404: {"description": "Not found"}},
)


@router.put("/")
def create_graph(
    request: Request,
    user_id: Annotated[str, Query(description="User Unique ID")]
):
    """Create a new graph for the user."""
    pass


@router.post("/{graph_id}")
def update_graph(
    request: Request,
    graph_id: Annotated[str, Path(description="Graph ID")],
    user_id: Annotated[str, Query(description="User Unique ID")]
):
    """Update an existing graph by its ID."""
    pass


@router.delete("/{graph_id}")
def delete_graph(
    request: Request,
    graph_id: Annotated[str, Path(description="Graph ID")],
    user_id: Annotated[str, Query(description="User Unique ID")]
):
    """Delete a graph by its ID."""
    pass


@router.get("/{graph_id}")
def get_graph(
    request: Request,
    graph_id: Annotated[str, Path(description="Graph ID")],
    user_id: Annotated[str, Query(description="User Unique ID")]
):
    """Get a graph by its ID."""
    pass


@router.get("/")
def list_graphs(
    request: Request,
    user_id: Annotated[str, Query(description="User Unique ID")]
):
    """List all graphs for the user."""
    pass
