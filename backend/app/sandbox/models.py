import enum
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, IDMixin, TimestampMixin


class SubmissionStatus(str, enum.Enum):
    pending = "pending"
    running = "running"
    passed = "passed"
    failed = "failed"
    error = "error"
    timeout = "timeout"


class CodeChallenge(Base, IDMixin, TimestampMixin):
    __tablename__ = "code_challenges"

    lesson_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("lessons.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="")
    language: Mapped[str] = mapped_column(String(50), nullable=False)
    starter_code: Mapped[str | None] = mapped_column(Text)
    solution_code: Mapped[str | None] = mapped_column(Text)
    time_limit_seconds: Mapped[int] = mapped_column(Integer, default=10)
    memory_limit_mb: Mapped[int] = mapped_column(Integer, default=256)

    test_cases: Mapped[list["TestCase"]] = relationship(
        back_populates="challenge", cascade="all, delete-orphan", order_by="TestCase.sort_order"
    )


class TestCase(Base, IDMixin, TimestampMixin):
    __tablename__ = "test_cases"

    challenge_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("code_challenges.id", ondelete="CASCADE"), nullable=False
    )
    input: Mapped[str] = mapped_column(Text, default="")
    expected_output: Mapped[str] = mapped_column(Text, nullable=False)
    is_hidden: Mapped[bool] = mapped_column(Boolean, default=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    challenge: Mapped["CodeChallenge"] = relationship(back_populates="test_cases")


class CodeSubmission(Base, IDMixin):
    __tablename__ = "code_submissions"

    challenge_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("code_challenges.id", ondelete="CASCADE"), nullable=False
    )
    student_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    source_code: Mapped[str] = mapped_column(Text, nullable=False)
    language: Mapped[str] = mapped_column(String(50), nullable=False)
    status: Mapped[SubmissionStatus] = mapped_column(
        Enum(SubmissionStatus), default=SubmissionStatus.pending
    )
    results: Mapped[dict | None] = mapped_column(JSONB)
    total_passed: Mapped[int] = mapped_column(Integer, default=0)
    total_tests: Mapped[int] = mapped_column(Integer, default=0)
    execution_time_ms: Mapped[int | None] = mapped_column(Integer)
    submitted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
