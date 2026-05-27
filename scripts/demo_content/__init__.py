"""Demo course content package.

Each module exports a single ``COURSE`` dict consumed by
``scripts/seed_demo_org.py``. Keeping the data here (one course per file)
keeps the orchestration script small and lets writers edit one course
without touching the rest.

Exercise types are stored as **strings** (e.g. ``"quiz"``,
``"code_challenge"``). The orchestrator converts them to the
``ExerciseType`` enum at upsert time.
"""
from .english_b1_travel import COURSE as ENGLISH_B1
from .spanish_a1_first_words import COURSE as SPANISH_A1
from .german_a1_first_words import COURSE as GERMAN_A1
from .math5_fractions import COURSE as MATH5_FRACTIONS
from .math7_algebra import COURSE as MATH7_ALGEBRA
from .python_basics import COURSE as PYTHON_BASICS
from .web_html_css import COURSE as WEB_HTML_CSS

ALL_COURSES = [
    ENGLISH_B1,
    SPANISH_A1,
    GERMAN_A1,
    MATH5_FRACTIONS,
    MATH7_ALGEBRA,
    PYTHON_BASICS,
    WEB_HTML_CSS,
]

__all__ = [
    "ALL_COURSES",
    "ENGLISH_B1",
    "SPANISH_A1",
    "GERMAN_A1",
    "MATH5_FRACTIONS",
    "MATH7_ALGEBRA",
    "PYTHON_BASICS",
    "WEB_HTML_CSS",
]
