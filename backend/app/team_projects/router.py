from __future__ import annotations

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user, require_role
from app.auth.models import User, UserRole
from app.db.session import get_db
from app.team_projects.models import TeamMember, TeamMemberRole, TeamProject, TeamSubmission

router = APIRouter()


class TeamProjectCreate(BaseModel):
    title: str
    description: str = ""
    course_id: uuid.UUID | None = None
    deadline: datetime | None = None
    max_team_size: int = 4


class TeamProjectUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    deadline: datetime | None = None
    max_team_size: int | None = None


class TeamProjectResponse(BaseModel):
    id: uuid.UUID
    org_id: uuid.UUID
    course_id: uuid.UUID | None
    title: str
    description: str
    deadline: datetime | None
    max_team_size: int

    model_config = {"from_attributes": True}


class TeamSubmissionCreate(BaseModel):
    content: dict


class TeamSubmissionResponse(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    content: dict
    submitted_by: uuid.UUID | None

    model_config = {"from_attributes": True}


@router.post("", response_model=TeamProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    body: TeamProjectCreate,
    user: User = Depends(require_role(UserRole.admin, UserRole.teacher)),
    db: AsyncSession = Depends(get_db),
):
    project = TeamProject(
        org_id=user.org_id,
        course_id=body.course_id,
        title=body.title,
        description=body.description,
        deadline=body.deadline,
        max_team_size=body.max_team_size,
    )
    db.add(project)
    await db.flush()
    return project


@router.get("", response_model=list[TeamProjectResponse])
async def list_projects(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(TeamProject).where(TeamProject.org_id == user.org_id)
    )
    return result.scalars().all()


@router.get("/{project_id}", response_model=TeamProjectResponse)
async def get_project(
    project_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(TeamProject).where(
            TeamProject.id == project_id,
            TeamProject.org_id == user.org_id,
        )
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return project


@router.put("/{project_id}", response_model=TeamProjectResponse)
async def update_project(
    project_id: uuid.UUID,
    body: TeamProjectUpdate,
    user: User = Depends(require_role(UserRole.admin, UserRole.teacher)),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(TeamProject).where(
            TeamProject.id == project_id,
            TeamProject.org_id == user.org_id,
        )
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(project, field, value)
    await db.flush()
    return project


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: uuid.UUID,
    user: User = Depends(require_role(UserRole.admin)),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(TeamProject).where(
            TeamProject.id == project_id,
            TeamProject.org_id == user.org_id,
        )
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    await db.delete(project)


@router.post("/{project_id}/join", status_code=status.HTTP_201_CREATED)
async def join_project(
    project_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(TeamProject).where(
            TeamProject.id == project_id,
            TeamProject.org_id == user.org_id,
        )
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    existing = await db.execute(
        select(TeamMember).where(
            TeamMember.project_id == project_id,
            TeamMember.user_id == user.id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Already a member of this project"
        )

    member_count_result = await db.execute(
        select(TeamMember).where(TeamMember.project_id == project_id)
    )
    member_count = len(member_count_result.scalars().all())
    if member_count >= project.max_team_size:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Team is already full"
        )

    member = TeamMember(
        project_id=project_id,
        user_id=user.id,
        role=TeamMemberRole.member,
    )
    db.add(member)
    await db.flush()
    return {"project_id": str(project_id), "user_id": str(user.id), "role": member.role}


@router.post("/{project_id}/submit", response_model=TeamSubmissionResponse, status_code=status.HTTP_201_CREATED)
async def submit_project(
    project_id: uuid.UUID,
    body: TeamSubmissionCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(TeamProject).where(
            TeamProject.id == project_id,
            TeamProject.org_id == user.org_id,
        )
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    submission = TeamSubmission(
        project_id=project_id,
        content=body.content,
        submitted_by=user.id,
    )
    db.add(submission)
    await db.flush()
    return submission
