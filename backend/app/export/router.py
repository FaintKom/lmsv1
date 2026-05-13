"""Course export / import — JSON (schema v1) + PDF (Playwright).

Endpoints:
    GET  /courses/{id}/export?format=json [&variant=student|teacher]
    GET  /courses/{id}/export?format=pdf  [&variant=student|teacher]
    POST /courses/import                  (body: JSON schema v1)

JSON schema v1 is portable across GrassLMS instances. The teacher
variant includes correct answers, solutions, and grading rubrics;
the student variant strips those fields.

PDF rendering uses Playwright + Chromium against the running frontend
(SSR view of /courses/{id}/print). If playwright is not installed in
the backend container the endpoint returns 503 with a clear message
rather than crashing — the JSON path works regardless.
"""
from __future__ import annotations

import json
import logging
import uuid
from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth.dependencies import get_current_user
from app.auth.models import User, UserRole
from app.config import settings
from app.courses.models import Course, Lesson, Module
from app.db.session import get_db
from app.assessments.models import Question
from app.exercises.models import Exercise, ExerciseType
from app.sandbox.models import TestCase

logger = logging.getLogger(__name__)
router = APIRouter()


SCHEMA_VERSION = "grasslms-course-v1"


# ─── JSON serialise / deserialise ──────────────────────────────────────


def _strip_for_student(exercise_dict: dict) -> dict:
    """Remove answer keys from the exercise dict for student-variant exports."""
    cfg = exercise_dict.get("config", {})
    if isinstance(cfg, dict):
        for key in (
            "correct_answer",
            "final_answer",
            "solution_code",
            "accepted_answers",
            "expected_steps",
        ):
            cfg.pop(key, None)
    for q in exercise_dict.get("questions", []):
        q.pop("correct_answer", None)
        for opt in q.get("options", []) or []:
            if isinstance(opt, dict):
                opt.pop("is_correct", None)
    for tc in exercise_dict.get("test_cases", []):
        if tc.get("is_hidden"):
            tc["expected_output"] = ""
    return exercise_dict


def _serialise_course(course: Course, variant: str) -> dict:
    out: dict = {
        "schema": SCHEMA_VERSION,
        "variant": variant,
        "title": course.title,
        "slug": course.slug,
        "description": course.description,
        "category": course.category,
        "status": course.status.value if hasattr(course.status, "value") else str(course.status),
        "thumbnail_url": course.thumbnail_url,
        "modules": [],
    }
    for module in sorted(course.modules, key=lambda m: m.sort_order):
        m_out: dict = {
            "title": module.title,
            "sort_order": module.sort_order,
            "lessons": [],
        }
        for lesson in sorted(module.lessons, key=lambda l: l.sort_order):
            l_out: dict = {
                "title": lesson.title,
                "content_type": (
                    lesson.content_type.value
                    if hasattr(lesson.content_type, "value")
                    else str(lesson.content_type)
                ),
                "content": lesson.content,
                "sort_order": lesson.sort_order,
                "duration_minutes": lesson.duration_minutes,
                "exercises": [],
            }
            for ex in sorted(lesson.exercises, key=lambda e: e.sort_order):
                ex_out: dict = {
                    "exercise_type": (
                        ex.exercise_type.value
                        if hasattr(ex.exercise_type, "value")
                        else str(ex.exercise_type)
                    ),
                    "title": ex.title,
                    "sort_order": ex.sort_order,
                    "max_attempts": ex.max_attempts,
                    "config": dict(ex.config or {}),
                    "questions": [
                        {
                            "question_text": q.question_text,
                            "question_type": q.question_type,
                            "options": q.options,
                            "correct_answer": q.correct_answer,
                            "points": q.points,
                            "sort_order": q.sort_order,
                        }
                        for q in sorted(ex.questions, key=lambda x: x.sort_order)
                    ],
                    "test_cases": [
                        {
                            "input": tc.input,
                            "expected_output": tc.expected_output,
                            "is_hidden": tc.is_hidden,
                            "sort_order": tc.sort_order,
                        }
                        for tc in sorted(ex.test_cases, key=lambda x: x.sort_order)
                    ],
                }
                if variant == "student":
                    ex_out = _strip_for_student(ex_out)
                l_out["exercises"].append(ex_out)
            m_out["lessons"].append(l_out)
        out["modules"].append(m_out)
    return out


async def _load_course_full(db: AsyncSession, course_id: uuid.UUID) -> Course | None:
    q = (
        select(Course)
        .where(Course.id == course_id)
        .options(
            selectinload(Course.modules)
            .selectinload(Module.lessons)
            .selectinload(Lesson.exercises)
            .selectinload(Exercise.questions),
            selectinload(Course.modules)
            .selectinload(Module.lessons)
            .selectinload(Lesson.exercises)
            .selectinload(Exercise.test_cases),
        )
    )
    res = await db.execute(q)
    return res.scalar_one_or_none()


# ─── Endpoints ──────────────────────────────────────────────────────────


@router.get("/{course_id}/export")
async def export_course(
    course_id: uuid.UUID,
    format: Literal["json", "pdf"] = Query("json"),
    variant: Literal["student", "teacher"] = Query("teacher"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Response:
    course = await _load_course_full(db, course_id)
    if not course or course.org_id != user.org_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Course not found")
    if user.role == UserRole.student and variant == "teacher":
        raise HTTPException(
            status.HTTP_403_FORBIDDEN, "Students cannot export teacher variant"
        )

    if format == "json":
        data = _serialise_course(course, variant)
        return Response(
            content=json.dumps(data, ensure_ascii=False, indent=2),
            media_type="application/json",
            headers={
                "Content-Disposition": (
                    f'attachment; filename="{course.slug or "course"}-{variant}.json"'
                ),
            },
        )

    # PDF path — Playwright headless chromium
    try:
        from playwright.async_api import async_playwright  # type: ignore[import-not-found]
    except ImportError:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "PDF export requires playwright. Install via "
            "`pip install playwright && playwright install chromium` "
            "in the backend image, then redeploy.",
        )

    print_url = (
        f"{getattr(settings, 'app_url', None) or 'http://frontend:3000'}"
        f"/courses/{course_id}/print?variant={variant}"
    )
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        try:
            ctx = await browser.new_context()
            page = await ctx.new_page()
            await page.goto(print_url, wait_until="networkidle")
            pdf_bytes = await page.pdf(
                format="A4",
                margin={
                    "top": "20mm",
                    "bottom": "20mm",
                    "left": "15mm",
                    "right": "15mm",
                },
                print_background=True,
            )
        finally:
            await browser.close()

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": (
                f'attachment; filename="{course.slug or "course"}-{variant}.pdf"'
            ),
        },
    )


@router.post("/import")
async def import_course(
    body: dict[str, Any],
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Import a JSON-exported course as a new course in the current org."""
    if user.role not in (UserRole.teacher, UserRole.admin, UserRole.super_admin):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Teachers/admins only")
    if body.get("schema") != SCHEMA_VERSION:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"Unsupported schema. Expected '{SCHEMA_VERSION}', got '{body.get('schema')}'",
        )

    base_slug = (body.get("slug") or body.get("title") or "imported").lower().replace(" ", "-")
    new_slug = f"{base_slug}-{uuid.uuid4().hex[:6]}"
    course = Course(
        org_id=user.org_id,
        teacher_id=user.id,
        title=body.get("title") or "Imported course",
        slug=new_slug,
        description=body.get("description") or "",
        category=body.get("category"),
        thumbnail_url=body.get("thumbnail_url"),
    )
    db.add(course)
    await db.flush()

    for m_idx, m_data in enumerate(body.get("modules", [])):
        module = Module(
            course_id=course.id,
            title=m_data.get("title") or f"Module {m_idx + 1}",
            sort_order=m_data.get("sort_order", m_idx),
        )
        db.add(module)
        await db.flush()
        for l_idx, l_data in enumerate(m_data.get("lessons", [])):
            ct = l_data.get("content_type") or "text"
            lesson = Lesson(
                module_id=module.id,
                title=l_data.get("title") or f"Lesson {l_idx + 1}",
                content_type=ct,
                content=l_data.get("content") or {},
                sort_order=l_data.get("sort_order", l_idx),
                duration_minutes=l_data.get("duration_minutes"),
            )
            db.add(lesson)
            await db.flush()
            for e_idx, e_data in enumerate(l_data.get("exercises", [])):
                etype_raw = e_data.get("exercise_type", "quiz")
                try:
                    etype = ExerciseType(etype_raw)
                except ValueError:
                    logger.warning("skipping unknown exercise_type=%s", etype_raw)
                    continue
                exercise = Exercise(
                    lesson_id=lesson.id,
                    org_id=user.org_id,
                    display_id=f"IMP-{uuid.uuid4().hex[:6]}",
                    exercise_type=etype,
                    title=e_data.get("title") or "Imported exercise",
                    config=e_data.get("config") or {},
                    sort_order=e_data.get("sort_order", e_idx),
                    max_attempts=e_data.get("max_attempts"),
                )
                db.add(exercise)
                await db.flush()
                for q_idx, q_data in enumerate(e_data.get("questions", []) or []):
                    db.add(
                        Question(
                            exercise_id=exercise.id,
                            question_text=q_data.get("question_text", ""),
                            question_type=q_data.get("question_type", "single_choice"),
                            options=q_data.get("options"),
                            correct_answer=q_data.get("correct_answer"),
                            points=q_data.get("points", 1),
                            sort_order=q_data.get("sort_order", q_idx),
                        )
                    )
                for tc_idx, tc_data in enumerate(e_data.get("test_cases", []) or []):
                    db.add(
                        TestCase(
                            exercise_id=exercise.id,
                            input=tc_data.get("input", ""),
                            expected_output=tc_data.get("expected_output", ""),
                            is_hidden=tc_data.get("is_hidden", False),
                            sort_order=tc_data.get("sort_order", tc_idx),
                        )
                    )

    await db.flush()
    return {
        "id": str(course.id),
        "slug": course.slug,
        "title": course.title,
        "module_count": len(body.get("modules", [])),
    }
