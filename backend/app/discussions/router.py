import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.auth.models import User
from app.db.session import get_db
from app.discussions.schemas import CommentCreate, CommentResponse
from app.discussions.service import create_comment, delete_comment, get_lesson_comments

router = APIRouter()


@router.get("/lessons/{lesson_id}/comments", response_model=list[CommentResponse])
async def get_comments_endpoint(
    lesson_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await get_lesson_comments(db, lesson_id)


@router.post("/lessons/{lesson_id}/comments", response_model=CommentResponse)
async def create_comment_endpoint(
    lesson_id: uuid.UUID,
    data: CommentCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await create_comment(
        db, lesson_id, user.id, data.body, data.parent_id
    )


@router.delete("/comments/{comment_id}")
async def delete_comment_endpoint(
    comment_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await delete_comment(db, comment_id, user)
    return {"status": "ok"}
