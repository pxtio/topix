"""Tools API Router."""

from typing import Annotated

from fastapi import APIRouter, Body, Query, Request, Response

from topix.agents.datatypes.inputs import MindMapConversionInput
from topix.agents.mindmap.key_points_extract import KeyPointsExtract
from topix.agents.mindmap.mindmap_conversion import MindmapConversion
from topix.agents.mindmap.utils import convert_root_to_graph
from topix.agents.run import AgentRunner
from topix.api.datatypes.requests import ConvertToMindMapRequest, WebPagePreviewRequest
from topix.api.helpers import with_standard_response
from topix.utils.web import preview_webpage

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
    res = await AgentRunner.run(key_points_extractor, body.answer)
    converter = MindmapConversion()
    mindmap = await AgentRunner.run(converter, MindMapConversionInput(
        answer=body.answer,
        key_points=res
    ))

    if not mindmap:
        raise ValueError("Failed to convert mindmap")

    notes, links = convert_root_to_graph(mindmap)
    return {
        "notes": [note.model_dump(exclude_none=True) for note in notes],
        "links": [link.model_dump(exclude_none=True) for link in links]
    }


@router.post("/webpage/preview/", include_in_schema=False)
@router.post("/webpage/preview")
@with_standard_response
async def link_preview(
    response: Response,
    request: Request,
    user_id: Annotated[str, Query(description="User Unique ID")],
    body: Annotated[WebPagePreviewRequest, Body(description="Webpage URL to preview")]
):
    """Fetch a preview of the webpage at the given URL."""
    res = preview_webpage(body.url)
    return res.model_dump(exclude_none=True)
