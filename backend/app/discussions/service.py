import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth.models import User
from app.common.exceptions import ForbiddenError, NotFoundError
from app.discussions.models import Comment
from app.notifications.service import create_notification


async def create_comment(
    db: AsyncSession,
    lesson_id: uuid.UUID,
    user_id: uuid.UUID,
    body: str,
    parent_id: uuid.UUID | None = None,
) -> dict:
    comment = Comment(
        lesson_id=lesson_id,
        user_id=user_id,
        body=body,
        parent_id=parent_id,
    )
    db.add(comment)
    await db.flush()

    # Reload with user info
    result = await db.execute(
        select(Comment).where(Comment.id == comment.id)
    )
    saved = result.scalar_one()

    user_result = await db.execute(select(User).where(User.id == user_id))
    user = user_result.scalar_one()

    # Notify parent comment author about reply
    if parent_id:
        parent_result = await db.execute(
            select(Comment).where(Comment.id == parent_id)
        )
        parent_comment = parent_result.scalar_one_or_none()
        if parent_comment and parent_comment.user_id != user_id:
            await create_notification(
                db,
                parent_comment.user_id,
                title=f"{user.full_name} replied to your comment",
                body=body[:100],
                link=f"/courses/*/lessons/{lesson_id}",
            )

    return {
        "id": saved.id,
        "lesson_id": saved.lesson_id,
        "user_id": saved.user_id,
        "user_name": user.full_name,
        "user_avatar": user.avatar_url,
        "body": saved.body,
        "parent_id": saved.parent_id,
        "replies": [],
        "created_at": saved.created_at,
    }


async def get_lesson_comments(
    db: AsyncSession,
    lesson_id: uuid.UUID,
) -> list[dict]:
    # Get top-level comments with nested replies (2 levels)
    result = await db.execute(
        select(Comment)
        .where(Comment.lesson_id == lesson_id, Comment.parent_id.is_(None))
        .options(selectinload(Comment.replies).selectinload(Comment.replies))
        .order_by(Comment.created_at.desc())
    )
    comments = result.scalars().unique().all()

    # Collect all user IDs
    user_ids: set[uuid.UUID] = set()

    def collect_ids(c: Comment) -> None:
        user_ids.add(c.user_id)
        for r in c.replies:
            collect_ids(r)

    for c in comments:
        collect_ids(c)

    # Fetch users
    user_result = await db.execute(select(User).where(User.id.in_(user_ids)))
    users = {u.id: u for u in user_result.scalars().all()}

    def serialize(c: Comment) -> dict:
        u = users.get(c.user_id)
        return {
            "id": c.id,
            "lesson_id": c.lesson_id,
            "user_id": c.user_id,
            "user_name": u.full_name if u else "Unknown",
            "user_avatar": u.avatar_url if u else None,
            "body": c.body,
            "parent_id": c.parent_id,
            "replies": [serialize(r) for r in c.replies],
            "created_at": c.created_at,
        }

    return [serialize(c) for c in comments]


async def delete_comment(
    db: AsyncSession,
    comment_id: uuid.UUID,
    user: User,
) -> None:
    result = await db.execute(
        select(Comment).where(Comment.id == comment_id)
    )
    comment = result.scalar_one_or_none()
    if not comment:
        raise NotFoundError("Comment not found")

    # Only author or admin can delete
    if comment.user_id != user.id and user.role != "admin":
        raise ForbiddenError("Cannot delete this comment")

    await db.delete(comment)
