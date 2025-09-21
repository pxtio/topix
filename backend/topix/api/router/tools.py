"""Tools API Router."""

from typing import Annotated

from fastapi import APIRouter, Body, Depends, Request, Response

from topix.agents.mindmap.mapify import MapifyAgent
from topix.agents.mindmap.notify import NotifyAgent
from topix.agents.run import AgentRunner
from topix.api.datatypes.requests import ConvertToMindMapRequest, WebPagePreviewRequest
from topix.api.helpers import with_standard_response
from topix.api.utils.security import get_current_user_uid
from topix.utils.web import preview_webpage

router = APIRouter(
    prefix="/tools",
    tags=["tools"],
    responses={404: {"description": "Not found"}},
)


@router.post("/mindmaps:notify/", include_in_schema=False)
@router.post("/mindmaps:notify")
@with_standard_response
async def notify(
    response: Response,
    request: Request,
    current_user_uid: Annotated[str, Depends(get_current_user_uid)],
    body: Annotated[ConvertToMindMapRequest, Body(description="Mindmap conversion data")]
):
    """Convert a mindmap to a graph."""
    mapify_agent = NotifyAgent()
    res = await AgentRunner.run(mapify_agent, body.answer)
    notes, links = res

    return {
        "notes": [note.model_dump(exclude_none=True) for note in notes],
        "links": [link.model_dump(exclude_none=True) for link in links]
    }


@router.post("/mindmaps:mapify/", include_in_schema=False)
@router.post("/mindmaps:mapify")
@with_standard_response
async def mapify(
    response: Response,
    request: Request,
    current_user_uid: Annotated[str, Depends(get_current_user_uid)],
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
    current_user_uid: Annotated[str, Depends(get_current_user_uid)],
    body: Annotated[WebPagePreviewRequest, Body(description="Webpage URL to preview")]
):
    """Fetch a preview of the webpage at the given URL."""
    res = preview_webpage(body.url)
    return res.model_dump(exclude_none=True)
