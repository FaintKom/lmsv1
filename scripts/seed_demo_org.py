"""Seed the public "GrassLMS Demo" organization.

Creates a populated sandbox tenant referenced by `/auth/demo-login` (gated by
`settings.demo_mode_enabled`). Prospects hit https://grasslms.online/demo,
click "Try as student", and land on a dashboard that already shows three
enrolled courses with realistic progress, assignments, XP, badges and a
certificate — not the empty state a brand-new account would see.

Idempotent: re-running does not duplicate rows. All IDs derive from
`uuid.uuid5(NAMESPACE_DEMO, slug)` so the same row is upserted each time.
Lesson content blocks are always overwritten so edits in this file
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

_BACKEND_ROOT = Path(__file__).resolve().parent.parent / "backend"
if str(_BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(_BACKEND_ROOT))

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


# ─── Course content ────────────────────────────────────────────────────────

# Each course definition is a pure dict so the file stays scannable. Helpers
# below walk these structures and translate them into rows. Lesson "blocks"
# uses the V2 content schema (see backend/app/courses/service.py
# normalize_lesson_content); exercises are *separate* rows and lesson blocks
# of type "exercise" carry the exercise's UUID.

MATH_COURSE = {
    "slug": "math-5-fractions",
    "title": "Math 5: Fractions & Decimals",
    "description": (
        "A hands-on grade-5 unit on fractions and decimals. Mix of "
        "explainer videos, step-by-step problems, and quick quizzes."
    ),
    "category": "Mathematics",
    "modules": [
        {
            "slug": "m1-fractions",
            "title": "Fractions Basics",
            "lessons": [
                {
                    "slug": "l1-what-is-a-fraction",
                    "title": "What is a fraction?",
                    "duration": 12,
                    "text_md": (
                        "## What is a fraction?\n\n"
                        "A **fraction** represents a part of a whole. We write "
                        "a fraction as $\\frac{a}{b}$ where $a$ is the "
                        "*numerator* (how many parts) and $b$ is the "
                        "*denominator* (how many equal parts the whole is "
                        "divided into).\n\n"
                        "### Examples\n\n"
                        "- $\\frac{1}{2}$ — one half\n"
                        "- $\\frac{3}{4}$ — three quarters\n"
                        "- $\\frac{5}{8}$ — five eighths\n\n"
                        "> A fraction whose numerator is smaller than its "
                        "denominator (like $\\frac{2}{3}$) is called a "
                        "**proper fraction**."
                    ),
                    "exercises": [
                        {
                            "slug": "ex-fraction-quiz",
                            "type": ExerciseType.quiz,
                            "title": "Quick fraction check",
                            "config": {"passing_score": 70},
                            "questions": [
                                {
                                    "text": "What is the numerator of \\(\\frac{3}{8}\\)?",
                                    "options": [
                                        {"text": "3", "is_correct": True},
                                        {"text": "8", "is_correct": False},
                                        {"text": "11", "is_correct": False},
                                    ],
                                    "points": 1,
                                },
                                {
                                    "text": "Which fraction is a proper fraction?",
                                    "options": [
                                        {"text": "\\(\\frac{7}{4}\\)", "is_correct": False},
                                        {"text": "\\(\\frac{2}{5}\\)", "is_correct": True},
                                        {"text": "\\(\\frac{9}{9}\\)", "is_correct": False},
                                    ],
                                    "points": 1,
                                },
                            ],
                        },
                    ],
                },
                {
                    "slug": "l2-adding-fractions",
                    "title": "Adding fractions with the same denominator",
                    "duration": 15,
                    "text_md": (
                        "## Adding fractions (same denominator)\n\n"
                        "When two fractions share a denominator, simply add "
                        "the numerators and keep the denominator:\n\n"
                        "$$\\frac{a}{c} + \\frac{b}{c} = \\frac{a+b}{c}$$\n\n"
                        "### Worked example\n\n"
                        "$$\\frac{2}{7} + \\frac{3}{7} = \\frac{5}{7}$$\n\n"
                        "Try the step-by-step exercise below — the system "
                        "will check each intermediate step."
                    ),
                    "video": "https://www.youtube.com/embed/52ZlXsFJULI",
                    "exercises": [
                        {
                            "slug": "ex-add-fractions-step",
                            "type": ExerciseType.math_stepwise,
                            "title": "Solve: 1/4 + 2/4",
                            "config": {
                                "problem": "1/4 + 2/4",
                                "variable": "x",
                                "max_steps": 3,
                                "final_answer": "3/4",
                                "validate_steps": False,
                            },
                        },
                    ],
                },
                {
                    "slug": "l3-comparing-fractions",
                    "title": "Comparing fractions",
                    "duration": 10,
                    "text_md": (
                        "## Comparing fractions\n\n"
                        "With the **same denominator**, the bigger numerator "
                        "wins: $\\frac{3}{5} > \\frac{2}{5}$.\n\n"
                        "With the **same numerator**, the *smaller* "
                        "denominator wins (you're splitting the whole into "
                        "fewer, larger pieces): $\\frac{1}{3} > \\frac{1}{5}$.\n\n"
                        "For everything else, find a common denominator."
                    ),
                    "exercises": [
                        {
                            "slug": "ex-compare-truefalse",
                            "type": ExerciseType.true_false,
                            "title": "True or false: 1/3 > 1/4",
                            "config": {
                                "statement": "1/3 is greater than 1/4.",
                                "correct_answer": True,
                            },
                        },
                        {
                            "slug": "ex-compare-match",
                            "type": ExerciseType.matching,
                            "title": "Match each fraction to its decimal",
                            "config": {
                                "pairs": [
                                    {"left": "1/2", "right": "0.5"},
                                    {"left": "1/4", "right": "0.25"},
                                    {"left": "3/4", "right": "0.75"},
                                    {"left": "1/5", "right": "0.2"},
                                ],
                                "shuffle": True,
                            },
                        },
                    ],
                },
            ],
        },
        {
            "slug": "m2-decimals",
            "title": "Decimals",
            "lessons": [
                {
                    "slug": "l4-fraction-to-decimal",
                    "title": "From fractions to decimals",
                    "duration": 12,
                    "text_md": (
                        "## Converting fractions to decimals\n\n"
                        "Every fraction can be written as a decimal by "
                        "dividing the numerator by the denominator.\n\n"
                        "| Fraction | Decimal |\n"
                        "|---|---|\n"
                        "| 1/2 | 0.5 |\n"
                        "| 1/4 | 0.25 |\n"
                        "| 3/8 | 0.375 |\n"
                        "| 1/3 | 0.333… |\n"
                    ),
                    "exercises": [
                        {
                            "slug": "ex-fill-decimal",
                            "type": ExerciseType.fill_blanks,
                            "title": "Complete the decimal",
                            "config": {
                                "text": "The fraction 1/2 written as a decimal is ___.",
                                "blanks": ["0.5"],
                            },
                        },
                    ],
                },
                {
                    "slug": "l5-decimal-arithmetic",
                    "title": "Decimal arithmetic",
                    "duration": 14,
                    "text_md": (
                        "## Adding and subtracting decimals\n\n"
                        "Line up the decimal points and add column by column.\n\n"
                        "$$2.5 + 1.7 = 4.2$$\n\n"
                        "Watch out for missing trailing zeros: $2.5$ is the "
                        "same as $2.50$."
                    ),
                    "exercises": [
                        {
                            "slug": "ex-decimal-add-step",
                            "type": ExerciseType.math_stepwise,
                            "title": "Solve: 2.5 + 1.7",
                            "config": {
                                "problem": "2.5 + 1.7",
                                "variable": "x",
                                "max_steps": 2,
                                "final_answer": "4.2",
                                "validate_steps": False,
                            },
                        },
                    ],
                },
                {
                    "slug": "l6-word-problems",
                    "title": "Word problems",
                    "duration": 18,
                    "text_md": (
                        "## Putting it all together\n\n"
                        "Real-world problems often hide a fraction or decimal "
                        "behind everyday words. Practise spotting them."
                    ),
                    "exercises": [
                        {
                            "slug": "ex-word-quiz",
                            "type": ExerciseType.quiz,
                            "title": "Word-problem mini-quiz",
                            "config": {"passing_score": 60},
                            "questions": [
                                {
                                    "text": "A pizza is cut into 8 equal slices. You eat 3. What fraction did you eat?",
                                    "options": [
                                        {"text": "3/8", "is_correct": True},
                                        {"text": "5/8", "is_correct": False},
                                        {"text": "3/11", "is_correct": False},
                                    ],
                                    "points": 1,
                                },
                                {
                                    "text": "A bottle holds 0.75 litres. How much is that as a fraction of a litre?",
                                    "options": [
                                        {"text": "3/4", "is_correct": True},
                                        {"text": "7/5", "is_correct": False},
                                        {"text": "75/10", "is_correct": False},
                                    ],
                                    "points": 1,
                                },
                            ],
                        },
                    ],
                },
            ],
        },
    ],
}


ENGLISH_COURSE = {
    "slug": "english-b1-travel",
    "title": "English B1: Travel & Conversation",
    "description": (
        "Functional English for travellers at the intermediate (B1) level. "
        "Vocabulary, set phrases and listening tasks for airports, hotels "
        "and restaurants."
    ),
    "category": "Languages",
    "modules": [
        {
            "slug": "m1-airport",
            "title": "At the Airport",
            "lessons": [
                {
                    "slug": "l1-airport-vocab",
                    "title": "Airport vocabulary",
                    "duration": 10,
                    "text_md": (
                        "## Key airport words\n\n"
                        "Before you fly, get comfortable with these terms:\n\n"
                        "- **Boarding pass** — the ticket that lets you board the plane\n"
                        "- **Check-in** — the desk where you drop off luggage and confirm your seat\n"
                        "- **Gate** — the door you walk through to reach the aircraft\n"
                        "- **Departure / Arrival** — leaving / coming in\n"
                        "- **Layover** — a stop between two flights\n"
                    ),
                    "exercises": [
                        {
                            "slug": "ex-airport-srs",
                            "type": ExerciseType.srs_flashcard,
                            "title": "Airport flashcards",
                            "config": {
                                "cards": [
                                    {"front": "Boarding pass", "back": "The ticket that lets you board the plane"},
                                    {"front": "Check-in", "back": "The desk where you drop off luggage"},
                                    {"front": "Gate", "back": "The door you walk through to reach the aircraft"},
                                    {"front": "Layover", "back": "A stop between two flights"},
                                ],
                            },
                        },
                    ],
                },
                {
                    "slug": "l2-airport-phrases",
                    "title": "Common phrases",
                    "duration": 12,
                    "text_md": (
                        "## Phrases that get you through security\n\n"
                        "- \"I'd like a window seat, please.\"\n"
                        "- \"Is this the gate for flight BA 217?\"\n"
                        "- \"Do I need to remove my laptop from the bag?\"\n"
                        "- \"My flight has been delayed.\"\n"
                    ),
                    "exercises": [
                        {
                            "slug": "ex-airport-sentence",
                            "type": ExerciseType.sentence_builder,
                            "title": "Build the sentence",
                            "config": {
                                "words": ["I", "would", "like", "a", "window", "seat"],
                                "correct_order": ["I", "would", "like", "a", "window", "seat"],
                                "distractors": ["please", "the"],
                                "instructions": "Arrange the words into a polite request.",
                            },
                        },
                    ],
                },
                {
                    "slug": "l3-listening",
                    "title": "Listening: a delayed flight",
                    "duration": 15,
                    "text_md": (
                        "## Practise listening\n\n"
                        "Watch the short announcement clip, then answer the "
                        "comprehension question below."
                    ),
                    "video": "https://www.youtube.com/embed/3z9zKvP6mMQ",
                    "exercises": [
                        {
                            "slug": "ex-airport-reading",
                            "type": ExerciseType.reading,
                            "title": "Comprehension",
                            "config": {
                                "passage": (
                                    "Attention passengers on flight BA 217 to London. "
                                    "Your flight has been delayed by approximately one hour "
                                    "due to weather conditions. New boarding time is 15:30. "
                                    "We apologise for the inconvenience."
                                ),
                                "questions": [
                                    {
                                        "question": "Why is the flight delayed?",
                                        "type": "multiple_choice",
                                        "options": ["Weather", "Technical issue", "Crew shortage"],
                                        "correct_answer": "Weather",
                                    },
                                    {
                                        "question": "What is the new boarding time?",
                                        "type": "multiple_choice",
                                        "options": ["14:30", "15:30", "16:30"],
                                        "correct_answer": "15:30",
                                    },
                                ],
                            },
                        },
                    ],
                },
            ],
        },
        {
            "slug": "m2-restaurant",
            "title": "Restaurant & Hotel",
            "lessons": [
                {
                    "slug": "l4-ordering-food",
                    "title": "Ordering food",
                    "duration": 12,
                    "text_md": (
                        "## At a restaurant\n\n"
                        "Polite ways to order:\n\n"
                        "- \"Could I have the …, please?\"\n"
                        "- \"I'll have the …\"\n"
                        "- \"What would you recommend?\"\n"
                    ),
                    "exercises": [
                        {
                            "slug": "ex-food-dialogue",
                            "type": ExerciseType.dialogue,
                            "title": "Ordering coffee",
                            "config": {
                                "context": "You walk into a café.",
                                "messages": [
                                    {"speaker": "Barista", "text": "Hi! What can I get you?"},
                                    {
                                        "speaker": "You",
                                        "text": "",
                                        "options": [
                                            "A flat white, please.",
                                            "Coffee.",
                                            "Give me coffee now.",
                                        ],
                                    },
                                ],
                            },
                        },
                    ],
                },
                {
                    "slug": "l5-hotel",
                    "title": "Hotel check-in",
                    "duration": 10,
                    "text_md": (
                        "## At the front desk\n\n"
                        "Useful translations to practise."
                    ),
                    "exercises": [
                        {
                            "slug": "ex-hotel-translation",
                            "type": ExerciseType.translation,
                            "title": "Translate the request",
                            "config": {
                                "source_text": "I have a reservation under the name Thompson.",
                                "source_language": "en",
                                "target_language": "es",
                                "accepted_answers": [
                                    "Tengo una reserva a nombre de Thompson.",
                                    "Tengo una reserva a nombre Thompson.",
                                ],
                                "case_sensitive": False,
                            },
                        },
                    ],
                },
                {
                    "slug": "l6-menu",
                    "title": "Reading menus",
                    "duration": 12,
                    "text_md": (
                        "## Reading a menu\n\n"
                        "Practise scanning a menu for dietary info."
                    ),
                    "exercises": [
                        {
                            "slug": "ex-menu-reading",
                            "type": ExerciseType.reading,
                            "title": "Menu comprehension",
                            "config": {
                                "passage": (
                                    "STARTERS — Tomato soup (v) £6 · Smoked salmon £9. "
                                    "MAINS — Grilled chicken £14 · Mushroom risotto (v) £12 · "
                                    "Beef burger £15. DESSERTS — Apple pie £6 · Sorbet (vg) £5."
                                ),
                                "questions": [
                                    {
                                        "question": "Which main course is vegetarian?",
                                        "type": "multiple_choice",
                                        "options": ["Grilled chicken", "Mushroom risotto", "Beef burger"],
                                        "correct_answer": "Mushroom risotto",
                                    },
                                ],
                            },
                        },
                    ],
                },
            ],
        },
    ],
}


CS_COURSE = {
    "slug": "cs-web-basics",
    "title": "Computer Science: Web Basics",
    "description": (
        "Get hands-on with HTML, CSS and JavaScript. Live preview, "
        "auto-graded code challenges, no install required."
    ),
    "category": "Computer Science",
    "modules": [
        {
            "slug": "m1-html-css",
            "title": "HTML & CSS",
            "lessons": [
                {
                    "slug": "l1-html-elements",
                    "title": "HTML elements",
                    "duration": 12,
                    "text_md": (
                        "## What is HTML?\n\n"
                        "**HTML** (HyperText Markup Language) is the skeleton "
                        "of every web page. Pages are built from *elements*, "
                        "written between angle brackets.\n\n"
                        "```html\n"
                        "<h1>Hello, world!</h1>\n"
                        "<p>This is a paragraph.</p>\n"
                        "<a href=\"/about\">About us</a>\n"
                        "```\n\n"
                        "Common elements: `h1`–`h6` (headings), `p` "
                        "(paragraph), `a` (link), `img` (image), `ul` / `li` "
                        "(lists), `div` and `span` (generic containers)."
                    ),
                    "exercises": [
                        {
                            "slug": "ex-html-quiz",
                            "type": ExerciseType.quiz,
                            "title": "HTML basics",
                            "config": {"passing_score": 70},
                            "questions": [
                                {
                                    "text": "Which element creates a top-level heading?",
                                    "options": [
                                        {"text": "<h1>", "is_correct": True},
                                        {"text": "<p>", "is_correct": False},
                                        {"text": "<head>", "is_correct": False},
                                    ],
                                    "points": 1,
                                },
                                {
                                    "text": "Which attribute makes <a> point somewhere?",
                                    "options": [
                                        {"text": "src", "is_correct": False},
                                        {"text": "href", "is_correct": True},
                                        {"text": "link", "is_correct": False},
                                    ],
                                    "points": 1,
                                },
                            ],
                        },
                    ],
                },
                {
                    "slug": "l2-css-basics",
                    "title": "CSS basics: make it red",
                    "duration": 15,
                    "text_md": (
                        "## CSS in two lines\n\n"
                        "**CSS** describes how elements look. The simplest "
                        "rule has a selector and a single property:\n\n"
                        "```css\n"
                        "p { color: red; }\n"
                        "```\n\n"
                        "Try it in the live editor below — change the colour "
                        "of the paragraph and see the preview update."
                    ),
                    "exercises": [
                        {
                            "slug": "ex-css-red",
                            "type": ExerciseType.web_editor,
                            "title": "Make the paragraph red",
                            "config": {
                                "description": "Style the <p> element so its text is red.",
                                "starter_html": "<p>Hello, world!</p>",
                                "starter_css": "p {\n  /* your code here */\n}",
                                "starter_js": "",
                                "requirements": [
                                    "The <p> element must have color: red",
                                ],
                            },
                        },
                    ],
                },
                {
                    "slug": "l3-layout",
                    "title": "Layout with flexbox",
                    "duration": 18,
                    "text_md": (
                        "## Flexbox\n\n"
                        "Flexbox arranges items along a single axis. The "
                        "parent element becomes a *flex container* with "
                        "`display: flex`:\n\n"
                        "```css\n"
                        ".row { display: flex; gap: 1rem; }\n"
                        "```\n\n"
                        "Children become flex items, sitting side-by-side."
                    ),
                    "exercises": [
                        {
                            "slug": "ex-flex-row",
                            "type": ExerciseType.web_editor,
                            "title": "Lay out three boxes in a row",
                            "config": {
                                "description": "Make the three boxes sit side-by-side using flexbox.",
                                "starter_html": "<div class=\"row\">\n  <div class=\"box\">A</div>\n  <div class=\"box\">B</div>\n  <div class=\"box\">C</div>\n</div>",
                                "starter_css": ".row {\n  /* your code here */\n}\n.box { padding: 1rem; background: #6ee7b7; }",
                                "starter_js": "",
                                "requirements": [
                                    ".row must use display: flex",
                                ],
                            },
                        },
                    ],
                },
            ],
        },
        {
            "slug": "m2-js",
            "title": "JavaScript fundamentals",
            "lessons": [
                {
                    "slug": "l4-js-variables",
                    "title": "Variables & types",
                    "duration": 12,
                    "text_md": (
                        "## Declaring variables\n\n"
                        "Modern JS uses `let` (re-assignable) and `const` "
                        "(write-once). Avoid `var`.\n\n"
                        "```js\n"
                        "const name = 'Alex';\n"
                        "let score = 0;\n"
                        "score = score + 10;\n"
                        "```\n\n"
                        "Primitive types: `string`, `number`, `boolean`, "
                        "`null`, `undefined`."
                    ),
                    "exercises": [
                        {
                            "slug": "ex-js-types-quiz",
                            "type": ExerciseType.quiz,
                            "title": "Type check",
                            "config": {"passing_score": 70},
                            "questions": [
                                {
                                    "text": "Which keyword declares a value that won't change?",
                                    "options": [
                                        {"text": "let", "is_correct": False},
                                        {"text": "const", "is_correct": True},
                                        {"text": "var", "is_correct": False},
                                    ],
                                    "points": 1,
                                },
                                {
                                    "text": "What is the type of true?",
                                    "options": [
                                        {"text": "string", "is_correct": False},
                                        {"text": "boolean", "is_correct": True},
                                        {"text": "number", "is_correct": False},
                                    ],
                                    "points": 1,
                                },
                            ],
                        },
                    ],
                },
                {
                    "slug": "l5-functions",
                    "title": "Functions: write add()",
                    "duration": 18,
                    "text_md": (
                        "## Functions\n\n"
                        "A function packages a piece of logic so you can reuse it.\n\n"
                        "```python\n"
                        "def add(a, b):\n"
                        "    return a + b\n"
                        "```\n\n"
                        "Below, complete the `add` function so the auto-grader "
                        "passes every test case."
                    ),
                    "exercises": [
                        {
                            "slug": "ex-add-fn",
                            "type": ExerciseType.code_challenge,
                            "title": "Write add(a, b)",
                            "config": {
                                "language": "python",
                                "starter_code": "def add(a, b):\n    # return the sum of a and b\n    pass\n\nif __name__ == '__main__':\n    a, b = map(int, input().split())\n    print(add(a, b))\n",
                                "solution_code": "def add(a, b):\n    return a + b\n\nif __name__ == '__main__':\n    a, b = map(int, input().split())\n    print(add(a, b))\n",
                                "time_limit_seconds": 5,
                                "memory_limit_mb": 128,
                            },
                            "test_cases": [
                                {"input": "1 2", "expected_output": "3", "is_hidden": False},
                                {"input": "10 -3", "expected_output": "7", "is_hidden": False},
                                {"input": "0 0", "expected_output": "0", "is_hidden": True},
                                {"input": "-5 -5", "expected_output": "-10", "is_hidden": True},
                            ],
                        },
                    ],
                },
                {
                    "slug": "l6-arrays",
                    "title": "Working with arrays",
                    "duration": 18,
                    "text_md": (
                        "## Arrays\n\n"
                        "An array is an ordered list of values. Common "
                        "operations: indexing, length, iteration, sum.\n\n"
                        "Complete `sum_list` so it returns the sum of every "
                        "number in the input list."
                    ),
                    "exercises": [
                        {
                            "slug": "ex-sum-list",
                            "type": ExerciseType.code_challenge,
                            "title": "sum_list(nums)",
                            "config": {
                                "language": "python",
                                "starter_code": "def sum_list(nums):\n    # return the sum\n    pass\n\nif __name__ == '__main__':\n    nums = list(map(int, input().split()))\n    print(sum_list(nums))\n",
                                "solution_code": "def sum_list(nums):\n    return sum(nums)\n\nif __name__ == '__main__':\n    nums = list(map(int, input().split()))\n    print(sum_list(nums))\n",
                                "time_limit_seconds": 5,
                                "memory_limit_mb": 128,
                            },
                            "test_cases": [
                                {"input": "1 2 3", "expected_output": "6", "is_hidden": False},
                                {"input": "10", "expected_output": "10", "is_hidden": False},
                                {"input": "-1 1 -2 2", "expected_output": "0", "is_hidden": True},
                            ],
                        },
                    ],
                },
            ],
        },
    ],
}


ALL_COURSES = [MATH_COURSE, ENGLISH_COURSE, CS_COURSE]


# ─── Builders ───────────────────────────────────────────────────────────────

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
    """Create or fetch an Exercise (+ Question / TestCase children)."""
    ex_id = did(f"{course_slug}/{lesson_slug}/{spec['slug']}")
    existing = await db.get(Exercise, ex_id)
    if existing is not None:
        return existing

    prefix = EXERCISE_TYPE_PREFIX.get(spec["type"].value, "X")
    # Display_id must be unique globally — suffix with hex slice of UUID.
    suffix = ex_id.hex[:6].upper()
    display_id = f"{org.slug}-{prefix}-{suffix}"

    ex = Exercise(
        id=ex_id,
        lesson_id=lesson.id,
        org_id=org.id,
        display_id=display_id,
        exercise_type=spec["type"],
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
        "body": text_md,
        "format": "markdown",
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
# 100% = mark every lesson completed
#  60% = first 4 of 6 lessons completed, next in_progress
#  20% = first 1 of 6 lessons completed, next in_progress
PROGRESS_PLAN = [
    # demo-student: one fully done, one mid, one early
    ("math-5-fractions", "demo-student", 100.0, 6),
    ("english-b1-travel", "demo-student", 60.0, 4),
    ("cs-web-basics", "demo-student", 20.0, 1),
    # extras — spread across courses for gradebook variety
    ("math-5-fractions", "demo-s2", 80.0, 5),
    ("math-5-fractions", "demo-s3", 40.0, 2),
    ("english-b1-travel", "demo-s4", 50.0, 3),
    ("cs-web-basics", "demo-s5", 30.0, 2),
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
            "your kitchen (e.g. half a pizza, a quarter cup). Submit a short "
            "write-up of 100–150 words."
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
        "slug": "cs-portfolio-page",
        "course_slug": "cs-web-basics",
        "title": "Build your portfolio landing page",
        "description": (
            "Use only HTML + CSS to build a single-page introduction (name, "
            "bio, 3 projects). Submit the HTML file."
        ),
        "due_offset_days": 3,
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
    for slug, days_ago in [("first-lesson", 18), ("week-warrior", 2)]:
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
            total_xp=320,
        ))
    else:
        streak.current_streak = 5
        streak.longest_streak = 12
        streak.last_activity_date = TODAY
        streak.total_xp = 320
    await db.flush()


CALENDAR_EVENTS = [
    {"slug": "math-live", "course_slug": "math-5-fractions",
     "title": "Live Q&A: fractions vs decimals", "type": EventType.lesson,
     "start_offset_hours": 28, "duration_min": 60,
     "description": "Bring your tricky problems!"},
    {"slug": "cs-deadline", "course_slug": "cs-web-basics",
     "title": "Portfolio page due", "type": EventType.deadline,
     "start_offset_hours": 72, "duration_min": 0,
     "description": "Submit your HTML/CSS portfolio."},
    {"slug": "english-deadline", "course_slug": "english-b1-travel",
     "title": "Restaurant role-play due", "type": EventType.deadline,
     "start_offset_hours": 96, "duration_min": 0,
     "description": "Voice memo, 60 seconds."},
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
            f"badges={len(BADGES)} events={len(CALENDAR_EVENTS)}"
        )
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
