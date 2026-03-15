import uuid

from fastapi import APIRouter, Depends, File, Form, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user, require_role
from app.auth.models import User, UserRole
from app.assignments.schemas import (
    AssignmentCreate,
    AssignmentListItem,
    AssignmentResponse,
    AssignmentUpdate,
    GradeRequest,
    SubmissionResponse,
)
from app.assignments import service
from app.db.session import get_db

router = APIRouter()


@router.post("", response_model=AssignmentResponse)
async def create_assignment(
    body: AssignmentCreate,
    user: User = Depends(require_role(UserRole.teacher, UserRole.admin)),
    db: AsyncSession = Depends(get_db),
):
    assignment = await service.create_assignment(db, user, body.model_dump())
    await db.commit()
    return await service.get_assignment(db, assignment.id, user)


@router.get("", response_model=list[AssignmentListItem])
async def list_assignments(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await service.list_assignments(db, user)


@router.get("/{assignment_id}", response_model=AssignmentResponse)
async def get_assignment(
    assignment_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await service.get_assignment(db, assignment_id, user)


@router.put("/{assignment_id}", response_model=AssignmentResponse)
async def update_assignment(
    assignment_id: uuid.UUID,
    body: AssignmentUpdate,
    user: User = Depends(require_role(UserRole.teacher, UserRole.admin)),
    db: AsyncSession = Depends(get_db),
):
    await service.update_assignment(
        db, assignment_id, user, body.model_dump(exclude_unset=True)
    )
    await db.commit()
    return await service.get_assignment(db, assignment_id, user)


@router.delete("/{assignment_id}", status_code=204)
async def delete_assignment(
    assignment_id: uuid.UUID,
    user: User = Depends(require_role(UserRole.teacher, UserRole.admin)),
    db: AsyncSession = Depends(get_db),
):
    await service.delete_assignment(db, assignment_id, user)
    await db.commit()


@router.post("/{assignment_id}/submit", response_model=SubmissionResponse)
async def submit_assignment(
    assignment_id: uuid.UUID,
    content: str | None = Form(None),
    file: UploadFile | None = File(None),
    user: User = Depends(require_role(UserRole.student)),
    db: AsyncSession = Depends(get_db),
):
    sub = await service.submit_assignment(db, assignment_id, user, content, file)
    await db.commit()
    return SubmissionResponse(
        id=sub.id,
        assignment_id=sub.assignment_id,
        student_id=sub.student_id,
        content=sub.content,
        file_path=sub.file_path,
        original_filename=sub.original_filename,
        submitted_at=sub.submitted_at,
        score=sub.score,
        feedback=sub.feedback,
        graded_by=sub.graded_by,
        graded_at=sub.graded_at,
        status=sub.status.value,
        created_at=sub.created_at,
    )


@router.get("/{assignment_id}/my-submission", response_model=SubmissionResponse | None)
async def get_my_submission(
    assignment_id: uuid.UUID,
    user: User = Depends(require_role(UserRole.student)),
    db: AsyncSession = Depends(get_db),
):
    sub = await service.get_my_submission(db, assignment_id, user)
    if not sub:
        return None
    return SubmissionResponse(
        id=sub.id,
        assignment_id=sub.assignment_id,
        student_id=sub.student_id,
        content=sub.content,
        file_path=sub.file_path,
        original_filename=sub.original_filename,
        submitted_at=sub.submitted_at,
        score=sub.score,
        feedback=sub.feedback,
        graded_by=sub.graded_by,
        graded_at=sub.graded_at,
        status=sub.status.value,
        created_at=sub.created_at,
    )


@router.get("/{assignment_id}/submissions", response_model=list[SubmissionResponse])
async def list_submissions(
    assignment_id: uuid.UUID,
    user: User = Depends(require_role(UserRole.teacher, UserRole.admin)),
    db: AsyncSession = Depends(get_db),
):
    return await service.list_submissions(db, assignment_id, user)


@router.put("/{assignment_id}/submissions/{submission_id}/grade", response_model=SubmissionResponse)
async def grade_submission(
    assignment_id: uuid.UUID,
    submission_id: uuid.UUID,
    body: GradeRequest,
    user: User = Depends(require_role(UserRole.teacher, UserRole.admin)),
    db: AsyncSession = Depends(get_db),
):
    sub = await service.grade_submission(
        db, assignment_id, submission_id, user, body.score, body.feedback
    )
    await db.commit()
    # Re-fetch to get student_name
    subs = await service.list_submissions(db, assignment_id, user)
    return next(s for s in subs if s["id"] == sub.id)
