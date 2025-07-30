"""Tools API Router."""

from typing import Annotated

from fastapi import APIRouter, Body, Query, Request, Response

from topix.agents.mindmap.key_points_extract import KeyPointsExtract
from topix.agents.mindmap.mindmap_conversion import MindmapConversion
from topix.agents.mindmap.utils import convert_root_to_graph
from topix.api.datatypes.requests import ConvertToMindMapRequest
from topix.api.helpers import with_standard_response

router = APIRouter(
    prefix="/tools",
    tags=["tools"],
    responses={404: {"description": "Not found"}},
)


@router.post("/mindmap:convert/", include_in_schema=False)
@router.post("/mindmap:convert")
@with_standard_response
async def convert_mindmap(
    response: Response,
    request: Request,
    user_id: Annotated[str, Query(description="User Unique ID")],
    body: Annotated[ConvertToMindMapRequest, Body(description="Mindmap conversion data")]
):
    """Convert a mindmap to a graph."""
    key_points_extractor = KeyPointsExtract()
    res = await key_points_extractor.run(body.answer)
    converter = MindmapConversion()
    mindmap = await converter.run(body.answer, res)

    if not mindmap:
        raise ValueError("Failed to convert mindmap")

    notes, links = convert_root_to_graph(mindmap)
    return {
        "notes": [note.model_dump(exclude_none=True) for note in notes],
        "links": [link.model_dump(exclude_none=True) for link in links]
    }
