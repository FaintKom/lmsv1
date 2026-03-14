import uuid

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.auth.models import User
from app.db.session import get_db
from app.submissions.schemas import (
    FileSubmissionResponse,
    InteractiveSubmissionResponse,
    InteractiveSubmitRequest,
)
from app.submissions.service import (
    get_file_submission,
    get_file_submissions,
    get_interactive_submissions,
    submit_interactive,
    upload_file,
)

router = APIRouter()


@router.post("/lessons/{lesson_id}/upload", response_model=FileSubmissionResponse)
async def upload_file_endpoint(
    lesson_id: uuid.UUID,
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        submission = await upload_file(db, lesson_id, user, file)
        return FileSubmissionResponse.model_validate(submission)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/lessons/{lesson_id}/files", response_model=list[FileSubmissionResponse])
async def list_files_endpoint(
    lesson_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    submissions = await get_file_submissions(db, lesson_id, user)
    return [FileSubmissionResponse.model_validate(s) for s in submissions]


@router.get("/files/{submission_id}/download")
async def download_file_endpoint(
    submission_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    submission = await get_file_submission(db, submission_id, user)
    return FileResponse(
        path=submission.file_path,
        filename=submission.original_filename,
        media_type=submission.mime_type,
    )


@router.post("/lessons/{lesson_id}/interactive", response_model=InteractiveSubmissionResponse)
async def submit_interactive_endpoint(
    lesson_id: uuid.UUID,
    data: InteractiveSubmitRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    submission = await submit_interactive(db, lesson_id, user, data.model_dump())
    return InteractiveSubmissionResponse.model_validate(submission)


@router.get("/lessons/{lesson_id}/interactive", response_model=list[InteractiveSubmissionResponse])
async def list_interactive_endpoint(
    lesson_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    submissions = await get_interactive_submissions(db, lesson_id, user)
    return [InteractiveSubmissionResponse.model_validate(s) for s in submissions]
