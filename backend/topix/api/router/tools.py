"""Tools API Router."""

from typing import Annotated

from fastapi import APIRouter, Body, Query, Request, Response

from topix.agents.mindmap.mapify import MapifyAgent
from topix.agents.run import AgentRunner
from topix.api.datatypes.requests import ConvertToMindMapRequest, WebPagePreviewRequest
from topix.api.helpers import with_standard_response
from topix.utils.web import preview_webpage

router = APIRouter(
    prefix="/tools",
    tags=["tools"],
    responses={404: {"description": "Not found"}},
)


@router.post("/mindmaps:convert/", include_in_schema=False)
@router.post("/mindmaps:convert")
@with_standard_response
async def convert_mindmap(
    response: Response,
    request: Request,
    user_id: Annotated[str, Query(description="User Unique ID")],
    body: Annotated[ConvertToMindMapRequest, Body(description="Mindmap conversion data")]
):
    """Convert a mindmap to a graph."""
    mapify_agent = MapifyAgent()
    res = await AgentRunner.run(mapify_agent, body.answer)
    notes, links = res

    return {
        "notes": [note.model_dump(exclude_none=True) for note in notes],
        "links": [link.model_dump(exclude_none=True) for link in links]
    }


@router.post("/webpages/preview/", include_in_schema=False)
@router.post("/webpages/preview")
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
