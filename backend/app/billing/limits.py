"""Plan limit enforcement — currently disabled (platform is free).

All checks are no-ops. The original enforcement code is preserved in
git history and can be restored when monetization is enabled.
"""
from __future__ import annotations

import uuid

from sqlalchemy.ext.asyncio import AsyncSession


async def check_student_limit(db: AsyncSession, org_id: uuid.UUID) -> None:
    return


async def check_course_limit(db: AsyncSession, org_id: uuid.UUID) -> None:
    return


async def check_group_limit(db: AsyncSession, org_id: uuid.UUID) -> None:
    return
