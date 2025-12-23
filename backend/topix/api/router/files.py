"""File-related API routes."""

import json
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, Response, UploadFile
from fastapi.params import File, Query

from topix.api.utils.decorators import with_standard_response
from topix.api.utils.security import get_current_user_uid
from topix.utils.common import gen_uid
from topix.utils.file import convert_to_base64_url, detect_mime_type, get_file_path, save_file

router = APIRouter(
    prefix="/files",
    tags=["files"],
    dependencies=[Depends(get_current_user_uid)],
    responses={404: {"description": "Not found"}},
)


@router.get("/", include_in_schema=False)
@router.get("")
@with_standard_response
async def get_file(
    response: Response,
    request: Request,
    filename: Annotated[str, Query(description="Filename to retrieve")]
):
    """Get file by filename."""
    file_path = get_file_path(filename)
    mime_type = detect_mime_type(file_path)
    base64_url = convert_to_base64_url(file_path, mime_type=mime_type)
    return {"base64_url": base64_url}


@router.post("/", include_in_schema=False)
@router.post("")
@with_standard_response
async def upload_file(
    response: Response,
    request: Request,
    file: UploadFile = File(..., description="File to upload"),
):
    """Upload a file."""
    file_bytes = await file.read()
    mime_type = detect_mime_type(file.filename)
    if mime_type.startswith("image/"):
        cat = "images"
    else:
        cat = "files"
    new_filename = f"{gen_uid()}_{file.filename}"
    saved_path = save_file(filename=new_filename, file_bytes=file_bytes, cat=cat)
    return {
        "file": {
            "url": saved_path
        }
    }


@router.post("/parse/", include_in_schema=False)
@router.post("/parse")
@with_standard_response
async def parse_file(
    response: Response,
    request: Request,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(..., description="File to parse"),
):
    """Parse a file."""
    file_bytes = await file.read()
    mime_type = detect_mime_type(file.filename)
    if mime_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Image files are not supported for parsing.")
    elif mime_type.startswith("application/pdf"):
        cat = "files"
        new_filename = f"{gen_uid()}_{file.filename}"
        saved_path = save_file(filename=new_filename, file_bytes=file_bytes, cat=cat)
    else:
        raise HTTPException(status_code=400, detail="Unsupported file type for parsing.")

    true_path = get_file_path(saved_path)

    # Generate a unique job ID for tracking parsing status
    job_id = gen_uid()

    # Store initial status in Redis
    redis_store = request.app.redis_store
    status_data = {
        "status": "pending",
        "filepath": true_path,
        "filename": file.filename,
        "message": "File parsing queued"
    }
    await redis_store.redis.setex(
        f"parse_job:{job_id}",
        3600,  # Expire after 1 hour
        json.dumps(status_data)
    )

    pipeline = request.app.parser_pipeline

    # Pass job_id and redis_store to the background task
    background_tasks.add_task(
        pipeline.process_file_with_status,
        true_path,
        job_id,
        redis_store
    )

    return {
        "status": "success",
        "data": {
            "job_id": job_id,
            "message": "File parsing started in background"
        }
    }


@router.get("/parse/status/{job_id}", include_in_schema=False)
@router.get("/parse/status/{job_id}")
@with_standard_response
async def get_parse_status(
    response: Response,
    request: Request,
    job_id: str,
):
    """Get the parsing status for a job."""
    redis_store = request.app.redis_store
    status_json = await redis_store.redis.get(f"parse_job:{job_id}")

    if not status_json:
        raise HTTPException(status_code=404, detail="Job not found")

    status_data = json.loads(status_json)
    return {
        "status": "success",
        "data": status_data
    }
