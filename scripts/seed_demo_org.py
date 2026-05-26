"""Seed the public "GrassLMS Demo" organization.

Creates a populated sandbox tenant referenced by `/auth/demo-login` (gated
by `settings.demo_mode_enabled`). Prospects hit https://grasslms.online/demo,
click "Try as student", and land on a dashboard that already shows
enrolled courses with realistic progress, assignments, XP, badges and a
certificate — not the empty state a brand-new account would see.

The course content (text, exercises, structure) lives in the
``scripts/demo_content/`` package — one Python file per course. This
script is purely orchestration: org, users, courses, enrollments,
progress, assignments, gamification, calendar, certificates.

Idempotent: re-running does not duplicate rows. All IDs derive from
`uuid.uuid5(NAMESPACE_DEMO, slug)` so the same row is upserted each time.
Lesson content blocks are always overwritten so edits in course files
propagate on re-run; user-created data in the demo org (vandalism by
prospects) is left alone except for fields explicitly normalised here.

Run inside the backend container after `alembic upgrade head`:

    docker compose -f docker-compose.prod.yml exec backend \\
        python scripts/seed_demo_org.py

Exit codes:
  0 — success
  non-zero — abort. Re-running after a failure is safe.
"""
import asyncio
import sys
import uuid
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

# Add backend to path (for app.* imports) and scripts/ itself (for the
# demo_content sub-package).
_SCRIPTS_ROOT = Path(__file__).resolve().parent
_BACKEND_ROOT = _SCRIPTS_ROOT.parent / "backend"
for p in (_BACKEND_ROOT, _SCRIPTS_ROOT):
    if str(p) not in sys.path:
        sys.path.insert(0, str(p))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

# Side-effect imports so SQLAlchemy can resolve string-based relationships.
import app.admin.models  # noqa: F401
import app.assessments.models  # noqa: F401
import app.assignments.models  # noqa: F401
import app.attendance.models  # noqa: F401
import app.auth.models  # noqa: F401
import app.billing.models  # noqa: F401
import app.calendar.models  # noqa: F401
import app.certificates.models  # noqa: F401
import app.courses.models  # noqa: F401
import app.discussions.models  # noqa: F401
import app.exercises.models  # noqa: F401
import app.gamification.models  # noqa: F401
import app.knowledge.models  # noqa: F401
import app.learning_paths.models  # noqa: F401
import app.meetings.models  # noqa: F401
import app.metered_billing.models  # noqa: F401
import app.notifications.models  # noqa: F401
import app.peer_review.models  # noqa: F401
import app.plagiarism.models  # noqa: F401
import app.progress.models  # noqa: F401
import app.recording.models  # noqa: F401
import app.sandbox.models  # noqa: F401
import app.scorm.models  # noqa: F401
import app.scorm_import.models  # noqa: F401
import app.skills.models  # noqa: F401
import app.submissions.models  # noqa: F401
import app.team_projects.models  # noqa: F401
import app.waitlist.models  # noqa: F401
import app.webhooks.models  # noqa: F401

from app.assessments.models import Question, QuestionType
from app.assignments.models import Assignment, AssignmentStatus, AssignmentSubmission
from app.auth.models import Organization, User, UserRole
from app.auth.security import hash_password
from app.calendar.models import CalendarEvent, EventType
from app.certificates.models import Certificate
from app.courses.models import Course, CourseStatus, Lesson, Module
from app.db.session import async_session_factory
from app.exercises.models import EXERCISE_TYPE_PREFIX, Exercise, ExerciseType
from app.gamification.models import Badge, UserBadge, UserStreak
from app.progress.models import Enrollment, LessonProgress, LessonStatus
from app.sandbox.models import TestCase

from demo_content import ALL_COURSES

NAMESPACE_DEMO = uuid.UUID("d3d3d3d3-1111-2222-3333-444444444444")
DEMO_PASSWORD = "demo-public-not-secret"  # noqa: S105 — public sandbox creds


def did(slug: str) -> uuid.UUID:
    return uuid.uuid5(NAMESPACE_DEMO, slug)


NOW = datetime.now(timezone.utc)
TODAY = date.today()


# ─── Org & users ────────────────────────────────────────────────────────────

DEMO_ORG_ID = did("demo-org")

DEMO_USERS = [
    {"slug": "demo-teacher", "email": "demo-teacher@grasslms.online",
     "name": "Sarah Miller", "role": UserRole.teacher},
    {"slug": "demo-student", "email": "demo-student@grasslms.online",
     "name": "Alex Thompson", "role": UserRole.student},
    {"slug": "demo-s2", "email": "demo-s2@grasslms.online",
     "name": "Maria Garcia", "role": UserRole.student},
    {"slug": "demo-s3", "email": "demo-s3@grasslms.online",
     "name": "Liam O'Connor", "role": UserRole.student},
    {"slug": "demo-s4", "email": "demo-s4@grasslms.online",
     "name": "Yuki Tanaka", "role": UserRole.student},
    {"slug": "demo-s5", "email": "demo-s5@grasslms.online",
     "name": "Noah Schmidt", "role": UserRole.student},
]


async def upsert_org(db: AsyncSession) -> Organization:
    existing = await db.get(Organization, DEMO_ORG_ID)
    if existing:
        return existing
    org = Organization(
        id=DEMO_ORG_ID,
        name="GrassLMS Demo",
        slug="demo",
        is_active=True,
        settings={"display_name": "GrassLMS Demo"},
    )
    db.add(org)
    await db.flush()
    return org


async def upsert_users(db: AsyncSession, org: Organization) -> dict[str, User]:
    """Upsert demo users. Match by id then email — same trick as seed_qa."""
    pw_hash = hash_password(DEMO_PASSWORD)
    users: dict[str, User] = {}
    for spec in DEMO_USERS:
        uid = did(spec["slug"])
        existing = await db.get(User, uid)
        if existing is None:
            existing = (await db.execute(
                select(User).where(User.email == spec["email"])
            )).scalar_one_or_none()
        if existing is not None:
            existing.email = spec["email"]
            existing.org_id = org.id
            existing.full_name = spec["name"]
            existing.role = spec["role"]
            existing.is_active = True
            existing.hashed_password = pw_hash
            existing.email_verified_at = NOW
            users[spec["slug"]] = existing
            continue
        user = User(
            id=uid,
            org_id=org.id,
            email=spec["email"],
            hashed_password=pw_hash,
            full_name=spec["name"],
            role=spec["role"],
            is_active=True,
            email_verified_at=NOW,
        )
        db.add(user)
        users[spec["slug"]] = user
    await db.flush()
    return users


# ─── Builders ───────────────────────────────────────────────────────────────


def _coerce_exercise_type(value) -> ExerciseType:
    """Accept either an ``ExerciseType`` or a string and return the enum."""
    if isinstance(value, ExerciseType):
        return value
    if isinstance(value, str):
        try:
            return ExerciseType(value)
        except ValueError as exc:
            raise ValueError(
                f"Unknown exercise type {value!r}. "
                f"Valid: {', '.join(t.value for t in ExerciseType)}"
            ) from exc
    raise TypeError(f"Exercise type must be ExerciseType or str, got {type(value)}")


async def _upsert_exercise(
    db: AsyncSession,
    *,
    lesson: Lesson,
    org: Organization,
    course_slug: str,
    lesson_slug: str,
    spec: dict,
    sort_order: int,
) -> Exercise:
    """Create or refresh an Exercise (+ Question / TestCase children).

    On re-run we OVERWRITE title/config/sort_order on existing exercises
    and rebuild their children — that way content edits in this file
    propagate to prod on the next seed.
    """
    ex_id = did(f"{course_slug}/{lesson_slug}/{spec['slug']}")
    ex_type = _coerce_exercise_type(spec["type"])
    existing = await db.get(Exercise, ex_id)

    prefix = EXERCISE_TYPE_PREFIX.get(ex_type.value, "X")
    suffix = ex_id.hex[:6].upper()
    display_id = f"{org.slug}-{prefix}-{suffix}"

    if existing is not None:
        existing.title = spec["title"]
        existing.config = spec.get("config", {})
        existing.sort_order = sort_order
        existing.exercise_type = ex_type
        # Clear and rebuild children
        from sqlalchemy import delete as sa_delete
        await db.execute(sa_delete(Question).where(Question.exercise_id == existing.id))
        await db.execute(sa_delete(TestCase).where(TestCase.exercise_id == existing.id))
        await db.flush()
        ex = existing
    else:
        ex = Exercise(
            id=ex_id,
            lesson_id=lesson.id,
            org_id=org.id,
            display_id=display_id,
            exercise_type=ex_type,
            title=spec["title"],
            config=spec.get("config", {}),
            sort_order=sort_order,
        )
        db.add(ex)
        await db.flush()

    for j, q in enumerate(spec.get("questions") or []):
        question = Question(
            id=did(f"{ex_id}/q{j}"),
            exercise_id=ex.id,
            question_text=q["text"],
            question_type=QuestionType.multiple_choice,
            options=q.get("options"),
            correct_answer=q.get("correct_answer"),
            points=q.get("points", 1),
            sort_order=j,
        )
        db.add(question)

    for k, tc in enumerate(spec.get("test_cases") or []):
        test_case = TestCase(
            id=did(f"{ex_id}/tc{k}"),
            exercise_id=ex.id,
            input=tc.get("input", ""),
            expected_output=tc["expected_output"],
            is_hidden=tc.get("is_hidden", False),
            sort_order=k,
        )
        db.add(test_case)

    await db.flush()
    return ex


def _inline_md(s: str) -> str:
    """Inline markdown -> HTML: **bold**, *italic*, `code`. Leaves $ math alone."""
    import re as _re
    s = _re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", s)
    s = _re.sub(r"(?<![\\\w*])\*([^*\n]+?)\*(?!\w)", r"<em>\1</em>", s)
    s = _re.sub(r"`([^`]+?)`", r"<code>\1</code>", s)
    return s


CALLOUT_STYLES = {
    "tip": {
        "border": "#f59e0b", "bg": "#fffbeb",
        "header_color": "#92400e", "body_color": "#78350f",
        "icon": "💡", "default_title": "Tip",
    },
    "note": {
        "border": "#3b82f6", "bg": "#eff6ff",
        "header_color": "#1e40af", "body_color": "#1e3a8a",
        "icon": "ℹ️", "default_title": "Note",
    },
    "warning": {
        "border": "#ef4444", "bg": "#fef2f2",
        "header_color": "#991b1b", "body_color": "#7f1d1d",
        "icon": "⚠️", "default_title": "Warning",
    },
    "example": {
        "border": "#10b981", "bg": "#ecfdf5",
        "header_color": "#065f46", "body_color": "#064e3b",
        "icon": "📘", "default_title": "Worked example",
    },
}


def _render_callout(kind: str, title: str, body_md: str) -> str:
    """Render a ::: callout block as a self-contained styled <aside>.

    Uses inline styles so the result survives any prose-plugin or HTML
    sanitiser that strips classes.
    """
    style = CALLOUT_STYLES.get(kind, CALLOUT_STYLES["note"])
    inner_html = _md_to_html(body_md.strip())
    display_title = title.strip() or style["default_title"]
    return (
        f'<aside style="margin:1.25rem 0;padding:1rem 1.25rem;'
        f'border-left:4px solid {style["border"]};background:{style["bg"]};'
        f'border-radius:8px;">'
        f'<div style="font-weight:600;color:{style["header_color"]};'
        f'margin-bottom:0.5rem;display:flex;align-items:center;gap:0.5rem;">'
        f'<span style="font-size:1.25em;line-height:1;">{style["icon"]}</span>'
        f'<span>{_inline_md(display_title)}</span>'
        f'</div>'
        f'<div style="color:{style["body_color"]};font-size:0.95em;'
        f'line-height:1.65;">{inner_html}</div>'
        f'</aside>'
    )


def _md_to_html(md: str) -> str:
    """Tiny markdown -> HTML converter for the subset used by seed lessons.

    Supports headings (## / ###), bold/italic, ordered (1. / 2. …) and
    unordered (- …) lists, blockquotes, fenced code blocks (```), GFM
    tables, paragraphs, horizontal rules (---), and callout blocks
    (``:::tip``, ``:::note``, ``:::warning``, ``:::example``). Leaves
    ``$...$`` / ``$$...$$`` untouched for KaTeX. Emits HTML so the
    renderer's math-block path doesn't ignore markdown formatting.

    Callout syntax::

        :::tip Pronunciation tip
        Body lines here, can contain **bold**, lists, etc.
        :::
    """
    import re as _re
    lines = md.split("\n")
    out: list[str] = []
    in_code = False
    code_lang = ""
    code_buf: list[str] = []
    in_ul = False
    in_ol = False
    in_table = False
    table_header_done = False
    para_buf: list[str] = []
    in_callout = False
    callout_kind = ""
    callout_title = ""
    callout_buf: list[str] = []
    callout_open_re = _re.compile(r"^:::\s*(tip|note|warning|example)\s*(.*)$")

    def flush_para() -> None:
        nonlocal para_buf
        if para_buf:
            text = " ".join(para_buf).strip()
            if text:
                out.append(f"<p>{_inline_md(text)}</p>")
            para_buf = []

    def flush_lists() -> None:
        nonlocal in_ul, in_ol
        if in_ul:
            out.append("</ul>")
            in_ul = False
        if in_ol:
            out.append("</ol>")
            in_ol = False

    def flush_table() -> None:
        nonlocal in_table, table_header_done
        if in_table:
            out.append("</tbody></table>")
            in_table = False
            table_header_done = False

    ol_pattern = _re.compile(r"^(\d+)\.\s+(.*)$")

    for raw in lines:
        line = raw.rstrip()
        # Inside a callout, buffer everything until matching `:::` line.
        if in_callout:
            if line.strip() == ":::":
                out.append(_render_callout(callout_kind, callout_title, "\n".join(callout_buf)))
                in_callout = False
                callout_kind = ""
                callout_title = ""
                callout_buf = []
            else:
                callout_buf.append(line)
            continue
        m_callout = callout_open_re.match(line)
        if m_callout:
            flush_para(); flush_lists(); flush_table()
            in_callout = True
            callout_kind = m_callout.group(1)
            callout_title = m_callout.group(2) or ""
            callout_buf = []
            continue
        if in_code:
            if line.startswith("```"):
                escaped = "\n".join(code_buf).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
                out.append(f'<pre><code class="language-{code_lang}">{escaped}</code></pre>')
                in_code = False
                code_lang = ""
                code_buf = []
            else:
                code_buf.append(line)
            continue
        if line.startswith("```"):
            flush_para(); flush_lists(); flush_table()
            in_code = True
            code_lang = line[3:].strip() or "text"
            continue
        if line.strip() == "---":
            flush_para(); flush_lists(); flush_table()
            out.append('<hr style="margin:1.5rem 0;border:0;border-top:1px solid #e5e7eb;">')
            continue
        if not line.strip():
            flush_para(); flush_lists(); flush_table()
            continue
        if line.startswith("### "):
            flush_para(); flush_lists(); flush_table()
            out.append(f"<h3>{_inline_md(line[4:])}</h3>")
            continue
        if line.startswith("## "):
            flush_para(); flush_lists(); flush_table()
            out.append(f"<h2>{_inline_md(line[3:])}</h2>")
            continue
        if line.startswith("> "):
            flush_para(); flush_lists(); flush_table()
            out.append(f"<blockquote>{_inline_md(line[2:])}</blockquote>")
            continue
        if line.startswith("- "):
            flush_para(); flush_table()
            if in_ol:
                out.append("</ol>"); in_ol = False
            if not in_ul:
                out.append("<ul>"); in_ul = True
            out.append(f"<li>{_inline_md(line[2:])}</li>")
            continue
        m = ol_pattern.match(line)
        if m:
            flush_para(); flush_table()
            if in_ul:
                out.append("</ul>"); in_ul = False
            if not in_ol:
                out.append("<ol>"); in_ol = True
            out.append(f"<li>{_inline_md(m.group(2))}</li>")
            continue
        if "|" in line and line.strip().startswith("|"):
            flush_para(); flush_lists()
            cells = [c.strip() for c in line.strip().strip("|").split("|")]
            if not in_table:
                out.append('<table class="md-table"><thead><tr>')
                out.extend(f"<th>{_inline_md(c)}</th>" for c in cells)
                out.append("</tr></thead><tbody>")
                in_table = True
                table_header_done = False
                continue
            if not table_header_done and all(_re.fullmatch(r"-+:?|:?-+:?", c) for c in cells):
                table_header_done = True
                continue
            out.append("<tr>")
            out.extend(f"<td>{_inline_md(c)}</td>" for c in cells)
            out.append("</tr>")
            continue
        flush_lists(); flush_table()
        para_buf.append(line.strip())

    flush_para(); flush_lists(); flush_table()
    if in_code:
        out.append("<pre><code>" + "\n".join(code_buf) + "</code></pre>")
    if in_callout:
        # Unclosed callout — render what we have so content isn't lost.
        out.append(_render_callout(callout_kind, callout_title, "\n".join(callout_buf)))
    return "\n".join(out)


def _blocks_for(text_md: str, video_url: str | None, exercise_ids: list[uuid.UUID],
                lesson_slug: str) -> list[dict]:
    """Build a v2 blocks array for a lesson."""
    blocks: list[dict] = []
    order = 0
    blocks.append({
        "id": str(did(f"{lesson_slug}/block/text-0")),
        "type": "text",
        "sort_order": order,
        "page": 1,
        "body": _md_to_html(text_md),
        "format": "html",
    })
    order += 1
    if video_url:
        blocks.append({
            "id": str(did(f"{lesson_slug}/block/video-0")),
            "type": "video",
            "sort_order": order,
            "page": 1,
            "url": video_url,
        })
        order += 1
    for i, ex_id in enumerate(exercise_ids):
        blocks.append({
            "id": str(did(f"{lesson_slug}/block/exercise-{i}")),
            "type": "exercise",
            "sort_order": order,
            "page": 1,
            "exercise_id": str(ex_id),
        })
        order += 1
    return blocks


async def delete_orphan_courses(
    db: AsyncSession, org: Organization, keep_slugs: set[str],
) -> list[str]:
    """Delete demo-org courses whose slug is not in the current ALL_COURSES set.

    Scoped strictly to ``org.id`` so production user content in other
    organisations is never touched. FK CASCADE on courses removes
    modules, lessons, exercises, enrollments, lesson_progress,
    assignments, assignment_submissions, calendar_events, certificates
    and related submissions automatically (see backend models).
    """
    result = await db.execute(
        select(Course).where(Course.org_id == org.id)
    )
    deleted: list[str] = []
    for course in result.scalars().all():
        if course.slug in keep_slugs:
            continue
        deleted.append(f"{course.slug} ({course.id})")
        await db.delete(course)
    if deleted:
        await db.flush()
    return deleted


async def upsert_course(
    db: AsyncSession, org: Organization, teacher: User, spec: dict,
) -> Course:
    course_id = did(f"course/{spec['slug']}")
    course = await db.get(Course, course_id)
    if not course:
        course = Course(
            id=course_id,
            org_id=org.id,
            teacher_id=teacher.id,
            title=spec["title"],
            slug=spec["slug"],
            description=spec["description"],
            category=spec["category"],
            status=CourseStatus.published,
        )
        db.add(course)
        await db.flush()
    else:
        # Refresh metadata on re-run so content edits propagate.
        course.title = spec["title"]
        course.description = spec["description"]
        course.category = spec["category"]

    # Remove orphan modules whose uuid5 isn't in the current spec — happens
    # when a module slug is renamed between runs. Cascade removes the
    # nested lessons/exercises/progress rows via FK.
    expected_module_ids = {
        did(f"module/{spec['slug']}/{m['slug']}")
        for m in spec["modules"]
    }
    existing_modules = (await db.execute(
        select(Module).where(Module.course_id == course.id)
    )).scalars().all()
    for m in existing_modules:
        if m.id not in expected_module_ids:
            await db.delete(m)
    if existing_modules:
        await db.flush()

    for m_idx, m_spec in enumerate(spec["modules"]):
        module_id = did(f"module/{spec['slug']}/{m_spec['slug']}")
        module = await db.get(Module, module_id)
        if not module:
            module = Module(
                id=module_id,
                course_id=course.id,
                title=m_spec["title"],
                sort_order=m_idx,
            )
            db.add(module)
            await db.flush()
        else:
            module.title = m_spec["title"]
            module.sort_order = m_idx

        for l_idx, l_spec in enumerate(m_spec["lessons"]):
            lesson_id = did(f"lesson/{spec['slug']}/{l_spec['slug']}")
            lesson = await db.get(Lesson, lesson_id)
            if not lesson:
                lesson = Lesson(
                    id=lesson_id,
                    module_id=module.id,
                    title=l_spec["title"],
                    sort_order=l_idx,
                    duration_minutes=l_spec.get("duration"),
                    content={},  # filled below after exercises exist
                )
                db.add(lesson)
                await db.flush()
            else:
                lesson.title = l_spec["title"]
                lesson.sort_order = l_idx
                lesson.duration_minutes = l_spec.get("duration")

            ex_ids: list[uuid.UUID] = []
            for ex_idx, ex_spec in enumerate(l_spec.get("exercises") or []):
                ex = await _upsert_exercise(
                    db,
                    lesson=lesson,
                    org=org,
                    course_slug=spec["slug"],
                    lesson_slug=l_spec["slug"],
                    spec=ex_spec,
                    sort_order=ex_idx,
                )
                ex_ids.append(ex.id)

            # Always overwrite content so edits in this file propagate on re-run.
            lesson.content = {
                "version": 2,
                "blocks": _blocks_for(
                    text_md=l_spec["text_md"],
                    video_url=l_spec.get("video"),
                    exercise_ids=ex_ids,
                    lesson_slug=l_spec["slug"],
                ),
            }
            db.add(lesson)
            await db.flush()

    return course


# ─── Enrollments, progress, assignments, gamification, calendar, certs ─────

# Progress targets per (course_slug, student_slug):
#   100% = mark every lesson completed
#    60% = first ~4 of 6 lessons completed, next in_progress
#    20% = first ~1 of 6 lessons completed, next in_progress
PROGRESS_PLAN = [
    # demo-student: a finished course, two mid-progress, two early
    ("math-5-fractions", "demo-student", 100.0, 6),
    ("english-b1-travel", "demo-student", 60.0, 4),
    ("python-basics", "demo-student", 20.0, 1),
    ("spanish-a1-first-words", "demo-student", 10.0, 0),
    ("math-7-algebra", "demo-student", 40.0, 2),
    # other students — spread for gradebook variety
    ("math-5-fractions", "demo-s2", 80.0, 5),
    ("math-7-algebra", "demo-s2", 30.0, 2),
    ("english-b1-travel", "demo-s3", 50.0, 3),
    ("spanish-a1-first-words", "demo-s4", 70.0, 4),
    ("python-basics", "demo-s5", 30.0, 2),
    ("web-html-css", "demo-s5", 50.0, 3),
    ("web-html-css", "demo-s2", 20.0, 1),
]


async def upsert_enrollments_and_progress(
    db: AsyncSession,
    courses: dict[str, Course],
    users: dict[str, User],
) -> None:
    for course_slug, user_slug, pct, completed_n in PROGRESS_PLAN:
        course = courses[course_slug]
        user = users[user_slug]
        enr_id = did(f"enrollment/{course_slug}/{user_slug}")
        enrollment = await db.get(Enrollment, enr_id)
        completed_at = (NOW - timedelta(days=1)) if pct >= 100.0 else None
        if not enrollment:
            enrollment = Enrollment(
                id=enr_id,
                course_id=course.id,
                student_id=user.id,
                enrolled_at=NOW - timedelta(days=21),
                progress_percent=pct,
                completed_at=completed_at,
            )
            db.add(enrollment)
            await db.flush()
        else:
            enrollment.progress_percent = pct
            enrollment.completed_at = completed_at

        result = await db.execute(
            select(Lesson).join(Module, Lesson.module_id == Module.id)
            .where(Module.course_id == course.id)
            .order_by(Module.sort_order, Lesson.sort_order)
        )
        lessons = result.scalars().all()
        for idx, lesson in enumerate(lessons):
            lp_id = did(f"lp/{enr_id}/{lesson.id}")
            lp = await db.get(LessonProgress, lp_id)
            if idx < completed_n:
                status = LessonStatus.completed
                lp_completed_at = NOW - timedelta(days=max(1, completed_n - idx))
            elif idx == completed_n:
                status = LessonStatus.in_progress
                lp_completed_at = None
            else:
                status = LessonStatus.not_started
                lp_completed_at = None
            if not lp:
                db.add(LessonProgress(
                    id=lp_id,
                    enrollment_id=enrollment.id,
                    lesson_id=lesson.id,
                    status=status,
                    completed_at=lp_completed_at,
                ))
            else:
                lp.status = status
                lp.completed_at = lp_completed_at
        await db.flush()


ASSIGNMENT_PLAN = [
    {
        "slug": "math-mini-project",
        "course_slug": "math-5-fractions",
        "title": "Mini-project: fractions in the kitchen",
        "description": (
            "Photograph or describe three real-world fractions you find in "
            "your kitchen (e.g. half a pizza, a quarter cup). Submit a "
            "short write-up of 100–150 words."
        ),
        "due_offset_days": -2,
        "max_score": 100,
        "submission": {
            "student_slug": "demo-student",
            "status": AssignmentStatus.graded,
            "score": 85.0,
            "feedback": "Nice work! Try to compare the fractions next time too.",
            "submitted_offset_days": -3,
            "graded_offset_days": -1,
            "content": "I found 1/2 a watermelon, 3/4 of a tea cup full, and 1/8 of the bread loaf left.",
        },
    },
    {
        "slug": "english-restaurant-roleplay",
        "course_slug": "english-b1-travel",
        "title": "Restaurant role-play (voice memo)",
        "description": (
            "Record a 60-second voice memo where you order a starter and a "
            "main course in English. Upload the file below."
        ),
        "due_offset_days": 4,
        "max_score": 100,
        "submission": {
            "student_slug": "demo-student",
            "status": AssignmentStatus.submitted,
            "score": None,
            "feedback": None,
            "submitted_offset_days": -1,
            "graded_offset_days": None,
            "content": "Voice memo uploaded (mock submission).",
        },
    },
    {
        "slug": "spanish-shopping-list",
        "course_slug": "spanish-a1-first-words",
        "title": "Make a Spanish shopping list",
        "description": (
            "Write a shopping list of 8 items in Spanish, then translate "
            "each to English. Submit as a single text or photo."
        ),
        "due_offset_days": 5,
        "max_score": 100,
        "submission": None,
    },
    {
        "slug": "algebra-real-world",
        "course_slug": "math-7-algebra",
        "title": "Linear equation in the real world",
        "description": (
            "Find one real-world example where a linear equation describes "
            "a relationship (phone plan, taxi fare, savings goal…). "
            "Identify slope and intercept. 150 words."
        ),
        "due_offset_days": 6,
        "max_score": 100,
        "submission": None,
    },
    {
        "slug": "python-fizzbuzz",
        "course_slug": "python-basics",
        "title": "FizzBuzz challenge (upload .py file)",
        "description": (
            "Write a Python program that prints numbers 1 to 100. For "
            "multiples of 3 print 'Fizz', for multiples of 5 print 'Buzz', "
            "for multiples of both print 'FizzBuzz'. Upload your .py file."
        ),
        "due_offset_days": 5,
        "max_score": 100,
        "submission": None,
    },
    {
        "slug": "web-portfolio-page",
        "course_slug": "web-html-css",
        "title": "Build your portfolio landing page",
        "description": (
            "Use only HTML + CSS to build a single-page introduction "
            "(name, bio, 3 projects). Submit the HTML file."
        ),
        "due_offset_days": 7,
        "max_score": 100,
        "submission": None,
    },
]


async def upsert_assignments(
    db: AsyncSession,
    org: Organization,
    teacher: User,
    courses: dict[str, Course],
    users: dict[str, User],
) -> None:
    for plan in ASSIGNMENT_PLAN:
        a_id = did(f"assignment/{plan['slug']}")
        course = courses[plan["course_slug"]]
        existing = await db.get(Assignment, a_id)
        due = NOW + timedelta(days=plan["due_offset_days"])
        if not existing:
            assignment = Assignment(
                id=a_id,
                org_id=org.id,
                course_id=course.id,
                created_by=teacher.id,
                title=plan["title"],
                description=plan["description"],
                due_date=due,
                max_score=plan["max_score"],
                allow_late=True,
            )
            db.add(assignment)
            await db.flush()
        else:
            assignment = existing
            assignment.title = plan["title"]
            assignment.description = plan["description"]
            assignment.due_date = due

        sub_plan = plan["submission"]
        if not sub_plan:
            continue
        student = users[sub_plan["student_slug"]]
        sub_id = did(f"submission/{plan['slug']}/{sub_plan['student_slug']}")
        existing_sub = await db.get(AssignmentSubmission, sub_id)
        submitted_at = NOW + timedelta(days=sub_plan["submitted_offset_days"])
        graded_at = (NOW + timedelta(days=sub_plan["graded_offset_days"])
                     if sub_plan["graded_offset_days"] is not None else None)
        if not existing_sub:
            db.add(AssignmentSubmission(
                id=sub_id,
                assignment_id=assignment.id,
                student_id=student.id,
                content=sub_plan.get("content"),
                submitted_at=submitted_at,
                score=sub_plan.get("score"),
                feedback=sub_plan.get("feedback"),
                graded_by=teacher.id if sub_plan.get("score") is not None else None,
                graded_at=graded_at,
                status=sub_plan["status"],
            ))
        else:
            existing_sub.score = sub_plan.get("score")
            existing_sub.feedback = sub_plan.get("feedback")
            existing_sub.status = sub_plan["status"]
            existing_sub.graded_at = graded_at
        await db.flush()


BADGES = [
    {"slug": "first-lesson", "name": "First Lesson",
     "description": "Complete your first lesson.", "icon": "⭐",
     "criteria_key": "first_lesson"},
    {"slug": "week-warrior", "name": "Week Warrior",
     "description": "Stay active for 5 days in a row.", "icon": "🔥",
     "criteria_key": "streak_5"},
    {"slug": "math-whiz", "name": "Math Whiz",
     "description": "Finish an entire math course.", "icon": "🧮",
     "criteria_key": "course_complete_math"},
    {"slug": "polyglot", "name": "Polyglot",
     "description": "Start two language courses.", "icon": "🌍",
     "criteria_key": "languages_2"},
    {"slug": "code-novice", "name": "Code Novice",
     "description": "Solve your first coding challenge.", "icon": "💻",
     "criteria_key": "first_code"},
]


async def upsert_gamification(
    db: AsyncSession, org: Organization, users: dict[str, User]
) -> None:
    badge_objs: dict[str, Badge] = {}
    for b in BADGES:
        b_id = did(f"badge/{b['slug']}")
        existing = await db.get(Badge, b_id)
        if not existing:
            existing = Badge(
                id=b_id,
                org_id=org.id,
                name=b["name"],
                description=b["description"],
                icon=b["icon"],
                criteria_key=b["criteria_key"],
                criteria={},
            )
            db.add(existing)
        badge_objs[b["slug"]] = existing
    await db.flush()

    student = users["demo-student"]
    for slug, days_ago in [
        ("first-lesson", 18),
        ("week-warrior", 2),
        ("math-whiz", 1),
        ("polyglot", 5),
    ]:
        ub_id = did(f"userbadge/{student.id}/{slug}")
        existing_ub = await db.get(UserBadge, ub_id)
        if not existing_ub:
            db.add(UserBadge(
                id=ub_id,
                user_id=student.id,
                badge_id=badge_objs[slug].id,
                earned_at=NOW - timedelta(days=days_ago),
            ))

    streak = (await db.execute(
        select(UserStreak).where(UserStreak.user_id == student.id)
    )).scalar_one_or_none()
    if not streak:
        db.add(UserStreak(
            id=did(f"streak/{student.id}"),
            user_id=student.id,
            current_streak=5,
            longest_streak=12,
            last_activity_date=TODAY,
            total_xp=540,
        ))
    else:
        streak.current_streak = 5
        streak.longest_streak = 12
        streak.last_activity_date = TODAY
        streak.total_xp = 540
    await db.flush()


CALENDAR_EVENTS = [
    {"slug": "math-live", "course_slug": "math-5-fractions",
     "title": "Live Q&A: fractions vs decimals", "type": EventType.lesson,
     "start_offset_hours": 28, "duration_min": 60,
     "description": "Bring your tricky problems!"},
    {"slug": "algebra-live", "course_slug": "math-7-algebra",
     "title": "Algebra office hours", "type": EventType.meeting,
     "start_offset_hours": 52, "duration_min": 45,
     "description": "Drop in with any algebra question."},
    {"slug": "spanish-club", "course_slug": "spanish-a1-first-words",
     "title": "Spanish conversation club", "type": EventType.meeting,
     "start_offset_hours": 76, "duration_min": 30,
     "description": "Practise café phrases in pairs."},
    {"slug": "web-deadline", "course_slug": "web-html-css",
     "title": "Portfolio page due", "type": EventType.deadline,
     "start_offset_hours": 168, "duration_min": 0,
     "description": "Submit your HTML/CSS portfolio."},
    {"slug": "english-deadline", "course_slug": "english-b1-travel",
     "title": "Restaurant role-play due", "type": EventType.deadline,
     "start_offset_hours": 96, "duration_min": 0,
     "description": "Voice memo, 60 seconds."},
    {"slug": "python-deadline", "course_slug": "python-basics",
     "title": "FizzBuzz due", "type": EventType.deadline,
     "start_offset_hours": 120, "duration_min": 0,
     "description": "Upload your .py solution."},
    {"slug": "office-hours", "course_slug": None,
     "title": "Open office hours", "type": EventType.meeting,
     "start_offset_hours": 48, "duration_min": 30,
     "description": "Drop in for any question."},
]


async def upsert_calendar(
    db: AsyncSession,
    org: Organization,
    teacher: User,
    courses: dict[str, Course],
) -> None:
    for ev in CALENDAR_EVENTS:
        ev_id = did(f"event/{ev['slug']}")
        existing = await db.get(CalendarEvent, ev_id)
        start = NOW + timedelta(hours=ev["start_offset_hours"])
        end = start + timedelta(minutes=ev["duration_min"]) if ev["duration_min"] else None
        if not existing:
            db.add(CalendarEvent(
                id=ev_id,
                org_id=org.id,
                course_id=courses[ev["course_slug"]].id if ev["course_slug"] else None,
                created_by=teacher.id,
                title=ev["title"],
                description=ev["description"],
                event_type=ev["type"],
                start_time=start,
                end_time=end,
            ))
        else:
            existing.start_time = start
            existing.end_time = end
            existing.title = ev["title"]
            existing.description = ev["description"]
    await db.flush()


async def upsert_certificate(
    db: AsyncSession, courses: dict[str, Course], users: dict[str, User]
) -> None:
    student = users["demo-student"]
    course = courses["math-5-fractions"]
    cert_id = did(f"cert/{student.id}/{course.id}")
    if await db.get(Certificate, cert_id):
        return
    number = f"DEMO-{cert_id.hex[:8].upper()}"
    db.add(Certificate(
        id=cert_id,
        user_id=student.id,
        course_id=course.id,
        certificate_number=number,
        issued_at=NOW - timedelta(days=1),
    ))
    await db.flush()


# ─── main ───────────────────────────────────────────────────────────────────

async def main() -> int:
    async with async_session_factory() as db:
        org = await upsert_org(db)
        users = await upsert_users(db, org)
        teacher = users["demo-teacher"]

        keep_slugs = {spec["slug"] for spec in ALL_COURSES}
        orphans = await delete_orphan_courses(db, org, keep_slugs)
        if orphans:
            print(f"REMOVED_ORPHANS={len(orphans)}: " + ", ".join(orphans))

        courses: dict[str, Course] = {}
        for spec in ALL_COURSES:
            courses[spec["slug"]] = await upsert_course(db, org, teacher, spec)

        await upsert_enrollments_and_progress(db, courses, users)
        await upsert_assignments(db, org, teacher, courses, users)
        await upsert_gamification(db, org, users)
        await upsert_calendar(db, org, teacher, courses)
        await upsert_certificate(db, courses, users)

        await db.commit()

        print(f"DEMO_ORG_ID={org.id}")
        print(f"DEMO_COURSES={','.join(str(c.id) for c in courses.values())}")
        print(
            f"OK: org={org.id} users={len(users)} courses={len(courses)} "
            f"badges={len(BADGES)} events={len(CALENDAR_EVENTS)} "
            f"orphans_removed={len(orphans)}"
        )
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
