"""Tools API Router."""

from typing import Annotated

from fastapi import APIRouter, Body, Query, Request

from topix.agents.mindmap.key_points_extract import KeyPointsExtract
from topix.agents.mindmap.mindmap_conversion import MindmapConversion
from topix.agents.mindmap.utils import convert_root_to_graph
from topix.api.datatypes.requests import ConvertToMindMapRequest
from topix.api.helpers import format_response

router = APIRouter(
    prefix="/tools",
    tags=["tools"],
    responses={404: {"description": "Not found"}},
)


@router.post("/mindmap:convert/", include_in_schema=False)
@router.post("/mindmap:convert")
async def convert_mindmap(
    request: Request,
    user_id: Annotated[str, Query(description="User Unique ID")],
    body: Annotated[ConvertToMindMapRequest, Body(description="Mindmap conversion data")]
):
    """Convert a mindmap to a graph."""
    async def convert_mindmap():
        """Convert the mindmap to a graph representation."""
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

    return await format_response(convert_mindmap)
