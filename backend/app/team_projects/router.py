from __future__ import annotations

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user, require_role
from app.auth.models import User, UserRole
from app.db.session import get_db
from app.team_projects.models import TeamMember, TeamMemberRole, TeamProject, TeamSubmission

router = APIRouter()

# Roles allowed to manage projects (create/update/delete/remove members).
_MANAGER_ROLES = (UserRole.admin, UserRole.teacher)


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
    member_count: int = 0
    is_member: bool = False

    model_config = {"from_attributes": True}


class TeamMemberResponse(BaseModel):
    user_id: uuid.UUID
    user_name: str
    role: str


class TeamSubmissionCreate(BaseModel):
    content: dict


class TeamSubmissionResponse(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    content: dict
    submitted_by: uuid.UUID | None

    model_config = {"from_attributes": True}


class TeamSubmissionRow(TeamSubmissionResponse):
    submitter_name: str | None
    created_at: datetime


async def _load_project(
    db: AsyncSession, project_id: uuid.UUID, user: User
) -> TeamProject:
    """Fetch a project scoped to the caller's org, or 404."""
    project = await db.scalar(
        select(TeamProject).where(
            TeamProject.id == project_id,
            TeamProject.org_id == user.org_id,
        )
    )
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Project not found"
        )
    return project


async def _member_for(
    db: AsyncSession, project_id: uuid.UUID, user_id: uuid.UUID
) -> TeamMember | None:
    return await db.scalar(
        select(TeamMember).where(
            TeamMember.project_id == project_id,
            TeamMember.user_id == user_id,
        )
    )


def _project_payload(project: TeamProject, member_count: int, is_member: bool) -> dict:
    return {
        "id": project.id,
        "org_id": project.org_id,
        "course_id": project.course_id,
        "title": project.title,
        "description": project.description,
        "deadline": project.deadline,
        "max_team_size": project.max_team_size,
        "member_count": member_count,
        "is_member": is_member,
    }


@router.post("", response_model=TeamProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    body: TeamProjectCreate,
    user: User = Depends(require_role(*_MANAGER_ROLES)),
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
    return _project_payload(project, 0, False)


@router.get("", response_model=list[TeamProjectResponse])
async def list_projects(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Member counts per project in one grouped query.
    count_rows = (
        await db.execute(
            select(TeamMember.project_id, func.count(TeamMember.id))
            .join(TeamProject, TeamProject.id == TeamMember.project_id)
            .where(TeamProject.org_id == user.org_id)
            .group_by(TeamMember.project_id)
        )
    ).all()
    counts = {pid: c for pid, c in count_rows}

    # Project ids the current user belongs to.
    my_rows = (
        await db.execute(
            select(TeamMember.project_id)
            .join(TeamProject, TeamProject.id == TeamMember.project_id)
            .where(
                TeamProject.org_id == user.org_id,
                TeamMember.user_id == user.id,
            )
        )
    ).all()
    mine = {pid for (pid,) in my_rows}

    projects = (
        await db.execute(
            select(TeamProject)
            .where(TeamProject.org_id == user.org_id)
            .order_by(TeamProject.created_at.desc())
        )
    ).scalars().all()
    return [
        _project_payload(p, counts.get(p.id, 0), p.id in mine) for p in projects
    ]


@router.get("/{project_id}", response_model=TeamProjectResponse)
async def get_project(
    project_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    project = await _load_project(db, project_id, user)
    member_count = await db.scalar(
        select(func.count(TeamMember.id)).where(TeamMember.project_id == project_id)
    )
    is_member = await _member_for(db, project_id, user.id) is not None
    return _project_payload(project, member_count or 0, is_member)


@router.put("/{project_id}", response_model=TeamProjectResponse)
async def update_project(
    project_id: uuid.UUID,
    body: TeamProjectUpdate,
    user: User = Depends(require_role(*_MANAGER_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    project = await _load_project(db, project_id, user)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(project, field, value)
    await db.flush()
    member_count = await db.scalar(
        select(func.count(TeamMember.id)).where(TeamMember.project_id == project_id)
    )
    is_member = await _member_for(db, project_id, user.id) is not None
    return _project_payload(project, member_count or 0, is_member)


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: uuid.UUID,
    user: User = Depends(require_role(*_MANAGER_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    project = await _load_project(db, project_id, user)
    await db.delete(project)


@router.get("/{project_id}/members", response_model=list[TeamMemberResponse])
async def list_members(
    project_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Any org user can view the roster; org isolation via _load_project.
    await _load_project(db, project_id, user)
    rows = (
        await db.execute(
            select(TeamMember, User.full_name, User.email)
            .join(User, User.id == TeamMember.user_id)
            .where(TeamMember.project_id == project_id)
            .order_by(User.full_name)
        )
    ).all()
    return [
        TeamMemberResponse(
            user_id=member.user_id,
            user_name=full_name or email,
            role=member.role.value,
        )
        for member, full_name, email in rows
    ]


@router.get("/{project_id}/submissions", response_model=list[TeamSubmissionRow])
async def list_submissions(
    project_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _load_project(db, project_id, user)
    # Team members + teachers/admins can view submissions.
    if user.role not in _MANAGER_ROLES and user.role != UserRole.super_admin:
        if await _member_for(db, project_id, user.id) is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only team members can view submissions",
            )
    rows = (
        await db.execute(
            select(TeamSubmission, User.full_name, User.email)
            .outerjoin(User, User.id == TeamSubmission.submitted_by)
            .where(TeamSubmission.project_id == project_id)
            .order_by(TeamSubmission.created_at.desc())
        )
    ).all()
    return [
        TeamSubmissionRow(
            id=sub.id,
            project_id=sub.project_id,
            content=sub.content,
            submitted_by=sub.submitted_by,
            submitter_name=(full_name or email) if sub.submitted_by else None,
            created_at=sub.created_at,
        )
        for sub, full_name, email in rows
    ]


@router.post("/{project_id}/join", status_code=status.HTTP_201_CREATED)
async def join_project(
    project_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    project = await _load_project(db, project_id, user)

    if await _member_for(db, project_id, user.id) is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Already a member of this project"
        )

    member_count = await db.scalar(
        select(func.count(TeamMember.id)).where(TeamMember.project_id == project_id)
    )
    if (member_count or 0) >= project.max_team_size:
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
    return {"project_id": str(project_id), "user_id": str(user.id), "role": member.role.value}


@router.post("/{project_id}/leave", status_code=status.HTTP_204_NO_CONTENT)
async def leave_project(
    project_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _load_project(db, project_id, user)
    member = await _member_for(db, project_id, user.id)
    if member is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Not a member of this project"
        )
    await db.delete(member)


@router.delete(
    "/{project_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT
)
async def remove_member(
    project_id: uuid.UUID,
    user_id: uuid.UUID,
    user: User = Depends(require_role(*_MANAGER_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    await _load_project(db, project_id, user)
    member = await _member_for(db, project_id, user_id)
    if member is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Member not found"
        )
    await db.delete(member)


@router.post("/{project_id}/submit", response_model=TeamSubmissionResponse, status_code=status.HTTP_201_CREATED)
async def submit_project(
    project_id: uuid.UUID,
    body: TeamSubmissionCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _load_project(db, project_id, user)
    # Only team members may submit on behalf of the team.
    if user.role not in _MANAGER_ROLES and user.role != UserRole.super_admin:
        if await _member_for(db, project_id, user.id) is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Join the team before submitting",
            )

    submission = TeamSubmission(
        project_id=project_id,
        content=body.content,
        submitted_by=user.id,
    )
    db.add(submission)
    await db.flush()
    return submission
