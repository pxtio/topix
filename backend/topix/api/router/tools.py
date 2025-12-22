"""Tools API Router."""

from typing import Annotated

from fastapi import APIRouter, Body, Depends, Request, Response

from topix.agents.datatypes.context import Context
from topix.agents.mindmap.mapify import MapifyAgent, convert_mapify_output_to_notes_links
from topix.agents.mindmap.notify import NotifyAgent, convert_notify_output_to_notes_links
from topix.agents.mindmap.schemify.schemify import SchemifyAgent, convert_schemify_output_to_notes_links
from topix.agents.run import AgentRunner
from topix.api.datatypes.requests import ConvertToMindMapRequest, WebPagePreviewRequest
from topix.api.utils.decorators import with_standard_response
from topix.api.utils.rate_limiter import rate_limiter
from topix.api.utils.security import get_current_user_uid
from topix.utils.web.preview import preview_webpage

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
    user_id: Annotated[str, Depends(get_current_user_uid)],
    body: Annotated[ConvertToMindMapRequest, Body(description="Mindmap conversion data")],
    _: Annotated[None, Depends(rate_limiter)],
):
    """Convert a mindmap to a graph."""
    context = Context()
    mapify_agent = NotifyAgent()
    res = await AgentRunner.run(mapify_agent, body.answer, context=context)
    notes, links = convert_notify_output_to_notes_links(res)

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
    user_id: Annotated[str, Depends(get_current_user_uid)],
    body: Annotated[ConvertToMindMapRequest, Body(description="Mindmap conversion data")],
    _: Annotated[None, Depends(rate_limiter)],
):
    """Convert a mindmap to a graph."""
    context = Context()
    mapify_agent = MapifyAgent()
    res = await AgentRunner.run(mapify_agent, body.answer, context=context)
    notes, links = convert_mapify_output_to_notes_links(res)

    return {
        "notes": [note.model_dump(exclude_none=True) for note in notes],
        "links": [link.model_dump(exclude_none=True) for link in links]
    }


@router.post("/mindmaps:schemify/", include_in_schema=False)
@router.post("/mindmaps:schemify")
@with_standard_response
async def schemify(
    response: Response,
    request: Request,
    user_id: Annotated[str, Depends(get_current_user_uid)],
    body: Annotated[ConvertToMindMapRequest, Body(description="Mindmap conversion data")],
    _: Annotated[None, Depends(rate_limiter)],
):
    """Convert a mindmap to a graph using Schemify."""
    context = Context()
    schemify_agent = SchemifyAgent()
    res = await AgentRunner.run(schemify_agent, body.answer, context=context)
    notes, links = convert_schemify_output_to_notes_links(res)

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
    user_id: Annotated[str, Depends(get_current_user_uid)],
    body: Annotated[WebPagePreviewRequest, Body(description="Webpage URL to preview")]
):
    """Fetch a preview of the webpage at the given URL."""
    res = preview_webpage(body.url)
    return res.model_dump(exclude_none=True)
