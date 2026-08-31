"""Create the "Kitchen Sink" course — every content block and every exercise type.

Purpose: one browsable course where a human can click through and see all 26
ExerciseType values render and grade, plus the content-block shapes the lesson
player supports (text / video / multi-page).

Exercise configs are NOT authored here. They are read from
``qa/exercise-fixtures.json`` — the same file ``scripts/seed_qa.py`` consumes,
which a seed-time check keeps in sync with the ``ExerciseType`` enum. Adding a
new exercise type to the backend therefore lands in this course automatically;
forgetting its fixture aborts both scripts with the same error.

Prose uses semantic HTML (h2/h3/p/ul/pre/code) plus the inline-styled
``<aside>`` callout already used by seeded prod content. No wrapper div with
hardcoded body colors — the lesson page owns typography.

Idempotent: re-running matches rows by deterministic uuid5 and leaves existing
ones untouched. Changing content here does NOT rewrite already-seeded rows;
drop the course (or the DB) and re-run to pick edits up.

Run locally:

    cd backend && python ../scripts/create_kitchen_sink_course.py --org-slug demo

Run in the prod container (scripts/ is not in the image — copy it first):

    docker compose -f docker-compose.prod.yml cp scripts/create_kitchen_sink_course.py backend:/tmp/ks.py
    docker compose -f docker-compose.prod.yml exec -T -e PYTHONPATH=/app backend python /tmp/ks.py --org-slug demo
"""
import argparse
import asyncio
import json
import sys
import uuid
from pathlib import Path

_REPO_ROOT = Path(__file__).resolve().parent.parent
_BACKEND_ROOT = _REPO_ROOT
if not (_BACKEND_ROOT / "app").is_dir() and (_BACKEND_ROOT / "backend" / "app").is_dir():
    _BACKEND_ROOT = _BACKEND_ROOT / "backend"
if str(_BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(_BACKEND_ROOT))

from sqlalchemy import select  # noqa: E402

# Side-effect imports: load every model module so SQLAlchemy can resolve the
# string-based relationship() references before the first query. Same list and
# same reason as scripts/seed_qa.py — trimming it raises NoReferencedTableError.
import app.admin.models  # noqa: F401,E402
import app.assessments.models  # noqa: F401,E402
import app.assignments.models  # noqa: F401,E402
import app.attendance.models  # noqa: F401,E402
import app.auth.models  # noqa: F401,E402
import app.billing.models  # noqa: F401,E402
import app.calendar.models  # noqa: F401,E402
import app.certificates.models  # noqa: F401,E402
import app.courses.models  # noqa: F401,E402
import app.exercises.models  # noqa: F401,E402
import app.gamification.models  # noqa: F401,E402
import app.learning_paths.models  # noqa: F401,E402
import app.metered_billing.models  # noqa: F401,E402
import app.notifications.models  # noqa: F401,E402
import app.peer_review.models  # noqa: F401,E402
import app.progress.models  # noqa: F401,E402
import app.recording.models  # noqa: F401,E402
import app.rooms.models  # noqa: F401,E402
import app.sandbox.models  # noqa: F401,E402
import app.sites.models  # noqa: F401,E402
import app.scorm.models  # noqa: F401,E402
import app.skills.models  # noqa: F401,E402
import app.submissions.models  # noqa: F401,E402
import app.team_projects.models  # noqa: F401,E402
import app.waitlist.models  # noqa: F401,E402
import app.webhooks.models  # noqa: F401,E402

from app.assessments.models import Question, QuestionType  # noqa: E402
from app.auth.models import Organization, User, UserRole  # noqa: E402
from app.courses.models import ContentType, Course, CourseStatus, Lesson, Module  # noqa: E402
from app.db.session import async_session_factory  # noqa: E402
from app.exercises.models import Exercise, ExerciseType  # noqa: E402
from app.sandbox.models import TestCase  # noqa: E402

FIXTURES_PATH = _REPO_ROOT / "qa" / "exercise-fixtures.json"

NAMESPACE_KS = uuid.UUID("9f1b7c2e-4d6a-5e8f-9a0b-1c2d3e4f5a6b")

# A stable public video, already used by seeded prod content — keeping the same
# one means the player is exercised against a URL known to work.
SAMPLE_VIDEO_URL = "https://www.youtube.com/watch?v=u6QfIXgjwGQ"

CALLOUT = (
    '<aside style="margin:1.25rem 0;padding:1rem 1.25rem;border-left:4px solid #f59e0b;'
    'background:#fffbeb;border-radius:8px;">'
    '<div style="font-weight:600;color:#92400e;margin-bottom:0.5rem;">{title}</div>'
    '<div style="color:#78350f;font-size:0.95em;line-height:1.65;">{body}</div>'
    "</aside>"
)


def ks_uuid(slug: str) -> uuid.UUID:
    return uuid.uuid5(NAMESPACE_KS, slug)


# ---------------------------------------------------------------------------
# Module plan — every ExerciseType lands in exactly one bucket.
# Coverage against the enum is asserted at startup, so a new type fails loudly
# here instead of silently missing from the course.
# ---------------------------------------------------------------------------
MODULE_PLAN: list[dict] = [
    {
        "slug": "knowledge-checks",
        "title": "Knowledge checks",
        "lesson_title": "Every knowledge-check type",
        "intro": (
            "<h2>Knowledge checks</h2>"
            "<p>These types grade a fixed answer: pick it, type it, pair it up, or put it "
            "in order. They are the workhorses of a course — quick to author, quick to "
            "answer, and gradeable without a human.</p>"
        ),
        "types": [
            "quiz",
            "true_false",
            "fill_blanks",
            "matching",
            "ordering",
            "categorize",
            "reading",
        ],
    },
    {
        "slug": "language-practice",
        "title": "Language practice",
        "lesson_title": "Every language-practice type",
        "intro": (
            "<h2>Language practice</h2>"
            "<p>Built for language courses, where the answer is a sentence rather than an "
            "option. Several of these grade forgivingly — accents and casing do not fail "
            "an otherwise correct answer.</p>"
        ),
        "types": [
            "translation",
            "sentence_builder",
            "dialogue",
            "conjugation",
            "listening",
            "srs_flashcard",
            "crossword",
            "word_search",
        ],
    },
    {
        "slug": "code-and-web",
        "title": "Code and web",
        "lesson_title": "Every code and web type",
        "intro": (
            "<h2>Code and web</h2>"
            "<p>The student writes code and the platform runs it. Submissions execute in "
            "the sandbox container — resource-limited, no network, read-only filesystem — "
            "so untrusted code cannot reach anything that matters.</p>"
        ),
        "types": ["code_challenge", "web_editor", "file_upload", "scorm_package"],
    },
    {
        "slug": "math",
        "title": "Math",
        "lesson_title": "Every math type",
        "intro": (
            "<h2>Math</h2>"
            "<p>Interactive widgets, step-by-step solutions, systems of equations, solid "
            "geometry, and bubble sheets for paper-style tests. Formulas render through "
            "KaTeX: inline like $a^2 + b^2 = c^2$, or as a display block.</p>"
            "<p>$$\\int_0^1 x^2\\,dx = \\frac{1}{3}$$</p>"
        ),
        "types": [
            "math_interactive",
            "math_stepwise",
            "math_system",
            "stereometry",
            "bubble_sheet",
        ],
    },
    {
        "slug": "simulations",
        "title": "Simulations and maps",
        "lesson_title": "Every simulation type",
        "intro": (
            "<h2>Simulations and maps</h2>"
            "<p>The heaviest types to render: a 2D robot driven by block programming, a 3D "
            "scene, and a map the student drops pins on. Worth checking on a slow "
            "connection — these are where a lesson page gets expensive.</p>"
        ),
        "types": ["robot_2d", "world_3d", "map_pin_drop"],
    },
]


# ---------------------------------------------------------------------------
# Content-only module (no exercises) — exercises the block shapes themselves.
# ---------------------------------------------------------------------------
CONTENT_LESSONS: list[dict] = [
    {
        "slug": "text-formatting",
        "title": "Text formatting",
        "blocks": [
            {
                "type": "text",
                "page": 1,
                "body": (
                    "<h2>What a text block can hold</h2>"
                    "<p>Theory is stored as HTML and sanitised before it reaches the "
                    "browser. Everything below is a formatting feature the lesson player "
                    "is expected to render correctly.</p>"
                    "<h3>Lists</h3>"
                    "<ul><li>Unordered item</li><li>Item with <strong>bold</strong> and "
                    "<em>italic</em></li><li>Item with <code>inline_code()</code></li></ul>"
                    "<ol><li>First step</li><li>Second step</li><li>Third step</li></ol>"
                    "<h3>Code</h3>"
                    "<pre><code>def greet(name):\n"
                    '    return f"Hello, {name}!"\n\n'
                    'print(greet("world"))</code></pre>'
                    "<h3>Math</h3>"
                    "<p>Inline math sits in the sentence: $E = mc^2$. Display math gets "
                    "its own line:</p>"
                    "<p>$$\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}$$</p>"
                    + CALLOUT.format(
                        title="Currency and dollar signs",
                        body=(
                            "<p>Write <em>50 dollars</em> rather than the dollar-sign form. "
                            "A stray dollar sign opens a math span and swallows the rest of "
                            "the paragraph.</p>"
                        ),
                    )
                ),
            }
        ],
    },
    {
        "slug": "video-lesson",
        "title": "Video",
        "blocks": [
            {
                "type": "text",
                "page": 1,
                "body": (
                    "<h2>Video block</h2>"
                    "<p>A video block holds a URL; the player embeds it and reports "
                    "watch progress back to the progress module.</p>"
                ),
            },
            {"type": "video", "page": 1, "url": SAMPLE_VIDEO_URL},
        ],
    },
    {
        "slug": "multi-page",
        "title": "Multi-page lesson",
        "blocks": [
            {
                "type": "text",
                "page": 1,
                "body": (
                    "<h2>Page one</h2>"
                    "<p>Blocks carry a <code>page</code> number. The player paginates on "
                    "it, so a long lesson can be split without creating separate lessons "
                    "and losing them from the module outline.</p>"
                ),
            },
            {
                "type": "text",
                "page": 2,
                "body": (
                    "<h2>Page two</h2>"
                    "<p>Progress is tracked per lesson, not per page — leaving on page two "
                    "and coming back should return the student here.</p>"
                ),
            },
            {
                "type": "text",
                "page": 3,
                "body": (
                    "<h2>Page three</h2>"
                    "<p>The last page. Check that the next/previous controls disable at "
                    "the ends rather than wrapping around.</p>"
                ),
            },
        ],
    },
]


def load_fixtures() -> dict[str, dict]:
    data = json.loads(FIXTURES_PATH.read_text(encoding="utf-8"))
    return {fx["type"]: fx for fx in data["fixtures"]}


def assert_coverage(fixtures: dict[str, dict]) -> None:
    """Every enum value must have a fixture AND a home in MODULE_PLAN."""
    enum_types = {e.value for e in ExerciseType}
    fx_types = set(fixtures)
    planned = [t for m in MODULE_PLAN for t in m["types"]]

    problems = []
    if enum_types - fx_types:
        problems.append(f"no fixture: {sorted(enum_types - fx_types)}")
    if fx_types - enum_types:
        problems.append(f"fixture for unknown type: {sorted(fx_types - enum_types)}")
    if enum_types - set(planned):
        problems.append(f"not in any module: {sorted(enum_types - set(planned))}")
    if len(planned) != len(set(planned)):
        dupes = sorted({t for t in planned if planned.count(t) > 1})
        problems.append(f"in more than one module: {dupes}")
    if problems:
        raise SystemExit("Kitchen-sink plan is out of sync — " + "; ".join(problems))


def block(kind: str, slug: str, sort_order: int, page: int, **fields) -> dict:
    """Build one v2 content block in the shape prod already stores."""
    return {
        "id": str(ks_uuid(f"block-{slug}")),
        "type": kind,
        "sort_order": sort_order,
        "page": page,
        **fields,
    }


async def resolve_org_and_teacher(db, org_slug: str) -> tuple[Organization, User]:
    org = (
        await db.execute(select(Organization).where(Organization.slug == org_slug))
    ).scalar_one_or_none()
    if org is None:
        raise SystemExit(f"No organization with slug {org_slug!r}. Pass --org-slug.")

    teacher = (
        await db.execute(
            select(User)
            .where(
                User.org_id == org.id,
                User.role.in_([UserRole.teacher, UserRole.admin]),
                User.is_active.is_(True),
            )
            .order_by(User.created_at)
        )
    ).scalars().first()
    if teacher is None:
        raise SystemExit(
            f"Organization {org_slug!r} has no active teacher or admin to own the course."
        )
    return org, teacher


async def upsert_course(db, org: Organization, teacher: User) -> Course:
    course_id = ks_uuid("course")
    course = await db.get(Course, course_id)
    if course:
        return course
    course = Course(
        id=course_id,
        org_id=org.id,
        teacher_id=teacher.id,
        title="Kitchen Sink — all content and exercise types",
        slug="kitchen-sink",
        description=(
            "A reference course containing every content block and every exercise type "
            "the platform supports. Not teaching material — it exists so a human can "
            "check that each type still renders and grades after a change."
        ),
        status=CourseStatus.published,
        category="platform",
    )
    db.add(course)
    await db.flush()
    return course


async def upsert_module(db, course: Course, slug: str, title: str, order: int) -> Module:
    module_id = ks_uuid(f"module-{slug}")
    module = await db.get(Module, module_id)
    if module:
        return module
    module = Module(id=module_id, course_id=course.id, title=title, sort_order=order)
    db.add(module)
    await db.flush()
    return module


async def upsert_lesson(
    db, module: Module, slug: str, title: str, order: int, blocks: list[dict]
) -> Lesson:
    lesson_id = ks_uuid(f"lesson-{slug}")
    lesson = await db.get(Lesson, lesson_id)
    if lesson:
        return lesson
    lesson = Lesson(
        id=lesson_id,
        module_id=module.id,
        title=title,
        content_type=ContentType.text,
        content={"version": 2, "blocks": blocks},
        sort_order=order,
        duration_minutes=10,
    )
    db.add(lesson)
    await db.flush()
    return lesson


async def upsert_exercise(
    db, course: Course, lesson: Lesson, fx: dict, order: int
) -> Exercise:
    """Create one exercise, owned by the course it sits in.

    The org comes from the course rather than from --org-slug on purpose. On
    2026-08-19 this script was run with the wrong slug against an existing course:
    it found the course by its deterministic id, kept going, and wrote four
    exercises stamped with another organisation into it. Reads scope by
    `user.org_id`, so the pupil could not see them, and they were somebody else's
    rows sitting inside this course. Passing the course makes that impossible to
    express.
    """
    ex_type = fx["type"]
    ex_id = ks_uuid(f"exercise-{ex_type}")
    existing = await db.get(Exercise, ex_id)
    if existing:
        return existing

    ex = Exercise(
        id=ex_id,
        lesson_id=lesson.id,
        org_id=course.org_id,
        display_id=f"KS-{ex_type[:10].upper()}-{order:02d}",
        exercise_type=ExerciseType(ex_type),
        title=fx.get("label", ex_type),
        config=fx.get("config", {}),
        sort_order=order,
    )
    db.add(ex)
    await db.flush()

    for j, q in enumerate(fx.get("questions") or []):
        db.add(
            Question(
                id=ks_uuid(f"question-{ex_type}-{j}"),
                exercise_id=ex.id,
                question_text=q["question_text"],
                question_type=QuestionType(q["question_type"]),
                options=q.get("options"),
                correct_answer=q.get("correct_answer"),
                points=q.get("points", 1),
                sort_order=j,
            )
        )
    for k, tc in enumerate(fx.get("test_cases") or []):
        db.add(
            TestCase(
                id=ks_uuid(f"testcase-{ex_type}-{k}"),
                exercise_id=ex.id,
                input=tc.get("input", ""),
                expected_output=tc["expected_output"],
                is_hidden=tc.get("is_hidden", False),
                sort_order=k,
            )
        )
    await db.flush()
    return ex


async def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--org-slug",
        default="demo",
        help="Organization that will own the course (default: demo)",
    )
    args = parser.parse_args()

    fixtures = load_fixtures()
    assert_coverage(fixtures)

    async with async_session_factory() as db:
        org, teacher = await resolve_org_and_teacher(db, args.org_slug)
        course = await upsert_course(db, org, teacher)
        if course.org_id != org.id:
            owner = await db.get(Organization, course.org_id)
            print(
                f"note: this course already belongs to {owner.slug!r}, not "
                f"{args.org_slug!r} — seeding into {owner.slug!r}, which is where "
                "its lessons and pupils are"
            )
            org = owner

        order = 0
        content_module = await upsert_module(
            db, course, "content-blocks", "Content blocks", order
        )
        for i, spec in enumerate(CONTENT_LESSONS):
            blocks = []
            for j, b in enumerate(spec["blocks"]):
                fields = {k: v for k, v in b.items() if k not in ("type", "page")}
                if b["type"] == "text":
                    fields["format"] = "html"
                blocks.append(
                    block(b["type"], f"{spec['slug']}-{j}", j, b.get("page", 1), **fields)
                )
            await upsert_lesson(
                db, content_module, spec["slug"], spec["title"], i, blocks
            )

        exercise_count = 0
        for plan in MODULE_PLAN:
            order += 1
            module = await upsert_module(
                db, course, plan["slug"], plan["title"], order
            )
            lesson = await upsert_lesson(
                db,
                module,
                plan["slug"],
                plan["lesson_title"],
                0,
                [
                    block(
                        "text",
                        f"{plan['slug']}-intro",
                        0,
                        1,
                        body=plan["intro"],
                        format="html",
                    )
                ],
            )
            # Rebuilt from scratch, never appended to what is already stored:
            # upsert_lesson returns the existing row on a re-run, so appending
            # would add a second copy of every exercise block each time. React
            # then renders duplicate keys and each exercise appears twice.
            blocks = [
                block(
                    "text",
                    f"{plan['slug']}-intro",
                    0,
                    1,
                    body=plan["intro"],
                    format="html",
                )
            ]
            for i, ex_type in enumerate(plan["types"]):
                ex = await upsert_exercise(db, course, lesson, fixtures[ex_type], i)
                exercise_count += 1
                blocks.append(
                    block(
                        "exercise",
                        f"{plan['slug']}-ex-{ex_type}",
                        i + 1,
                        1,
                        exercise_id=str(ex.id),
                    )
                )
            # Re-assign (not mutate) so SQLAlchemy sees the JSONB change.
            lesson.content = {"version": 2, "blocks": blocks}

        await db.commit()

        print(f"KS_COURSE_ID={course.id}")
        print(f"KS_ORG_ID={org.id}")
        print(f"KS_EXERCISE_COUNT={exercise_count}")
        print(
            f"OK: course={course.slug} modules={len(MODULE_PLAN) + 1} "
            f"exercises={exercise_count}"
        )
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
