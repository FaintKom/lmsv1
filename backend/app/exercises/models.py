import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, IDMixin, TimestampMixin


class ExerciseType(str, enum.Enum):
    quiz = "quiz"
    code_challenge = "code_challenge"
    matching = "matching"
    ordering = "ordering"
    fill_blanks = "fill_blanks"
    true_false = "true_false"
    categorize = "categorize"
    file_upload = "file_upload"
    robot_2d = "robot_2d"
    math_interactive = "math_interactive"
    world_3d = "world_3d"
    translation = "translation"
    sentence_builder = "sentence_builder"
    dialogue = "dialogue"
    conjugation = "conjugation"
    reading = "reading"
    web_editor = "web_editor"
    scorm_package = "scorm_package"
    math_stepwise = "math_stepwise"
    srs_flashcard = "srs_flashcard"
    crossword = "crossword"
    word_search = "word_search"
    map_pin_drop = "map_pin_drop"
    bubble_sheet = "bubble_sheet"


EXERCISE_TYPE_PREFIX = {
    "quiz": "Q",
    "code_challenge": "C",
    "matching": "M",
    "ordering": "O",
    "fill_blanks": "FB",
    "true_false": "T",
    "categorize": "G",
    "file_upload": "FU",
    "robot_2d": "R2",
    "math_interactive": "MI",
    "world_3d": "W3",
    "translation": "TR",
    "sentence_builder": "SB",
    "dialogue": "DG",
    "conjugation": "CJ",
    "reading": "RD",
    "web_editor": "W",
    "scorm_package": "SC",
    "math_stepwise": "MS",
    "srs_flashcard": "SF",
    "crossword": "CW",
    "word_search": "WS",
    "map_pin_drop": "MP",
    "bubble_sheet": "BS",
}


class Exercise(Base, IDMixin, TimestampMixin):
    __tablename__ = "exercises"

    lesson_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("lessons.id", ondelete="CASCADE"), nullable=False
    )
    org_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    display_id: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    exercise_type: Mapped[ExerciseType] = mapped_column(Enum(ExerciseType), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    config: Mapped[dict] = mapped_column(JSONB, default=dict)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    max_attempts: Mapped[int | None] = mapped_column(Integer, nullable=True, default=None)

    # Relationships
    lesson: Mapped["Lesson"] = relationship(back_populates="exercises")  # noqa: F821
    questions: Mapped[list["Question"]] = relationship(  # noqa: F821
        back_populates="exercise",
        cascade="all, delete-orphan",
        order_by="Question.sort_order",
        foreign_keys="[Question.exercise_id]",
    )
    test_cases: Mapped[list["TestCase"]] = relationship(  # noqa: F821
        back_populates="exercise",
        cascade="all, delete-orphan",
        order_by="TestCase.sort_order",
        foreign_keys="[TestCase.exercise_id]",
    )
    submissions: Mapped[list["ExerciseSubmission"]] = relationship(
        back_populates="exercise", cascade="all, delete-orphan"
    )


class ExerciseSubmission(Base, IDMixin, TimestampMixin):
    __tablename__ = "exercise_submissions"
    __table_args__ = (
        Index("ix_exercise_submissions_exercise_student", "exercise_id", "student_id"),
        Index("ix_exercise_submissions_submitted_at", "submitted_at"),
    )

    exercise_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("exercises.id", ondelete="CASCADE"), nullable=False
    )
    student_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )

    # Common fields
    answers: Mapped[dict | None] = mapped_column(JSONB)
    score: Mapped[float | None] = mapped_column(Float)
    passed: Mapped[bool | None] = mapped_column(Boolean)
    status: Mapped[str] = mapped_column(String(20), default="submitted")

    # Code challenge specific
    source_code: Mapped[str | None] = mapped_column(Text)
    language: Mapped[str | None] = mapped_column(String(20))
    execution_time_ms: Mapped[int | None] = mapped_column(Integer)
    total_passed: Mapped[int | None] = mapped_column(Integer)
    total_tests: Mapped[int | None] = mapped_column(Integer)
    results: Mapped[dict | None] = mapped_column(JSONB)

    # File upload specific
    original_filename: Mapped[str | None] = mapped_column(String(500))
    stored_filename: Mapped[str | None] = mapped_column(String(500))
    file_path: Mapped[str | None] = mapped_column(String(1000))
    file_size: Mapped[int | None] = mapped_column(Integer)
    mime_type: Mapped[str | None] = mapped_column(String(100))

    submitted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    graded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # Per-attempt analytics (Phase 1: task statistics for methodists).
    # All nullable for backward-compat — older clients omit elapsed_seconds and
    # rows created before this feature simply leave these NULL.
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    time_spent_seconds: Mapped[int | None] = mapped_column(Integer)
    attempt_number: Mapped[int | None] = mapped_column(Integer)

    # Relationships
    exercise: Mapped["Exercise"] = relationship(back_populates="submissions")
