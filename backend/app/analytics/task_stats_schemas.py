"""Pydantic response schemas for per-task statistics (Phase 2).

A "task" is one of three things a student submits against:

  - exercise  → exercise_submissions  (the unified v2 path, 20+ types)
  - quiz      → quiz_submissions       (legacy lesson quizzes)
  - assignment → assignment_submissions (teacher-graded assignments)

These schemas back the methodist task-stats dashboard (Phase 3 builds the
widget + CSV on top of them).
"""
import uuid
from datetime import date

from pydantic import BaseModel


class TaskStats(BaseModel):
    """Aggregated metrics for a single task."""

    task_id: uuid.UUID
    task_type: str  # "exercise" | "quiz" | "assignment"
    title: str
    course_id: uuid.UUID | None = None
    lesson_id: uuid.UUID | None = None

    total_submissions: int = 0
    unique_students: int = 0
    success_count: int = 0
    failure_count: int = 0
    # passed / total over rows where pass/fail is determined (NULL passed
    # excluded — e.g. ungraded assignments / web_editor submissions).
    pass_rate: float | None = None
    # Mean of the stored attempt_number across submissions (NULLs excluded).
    avg_attempts: float | None = None
    # Mean / median time-on-task in seconds (NULLs excluded).
    avg_time_spent_seconds: float | None = None
    median_time_spent_seconds: float | None = None
    # Distinct submitters / enrolled students in the course (NULL when the
    # enrollment count can't be resolved, e.g. assignment with no course).
    completion_rate: float | None = None


class CourseTaskStats(BaseModel):
    course_id: uuid.UUID
    course_title: str
    enrolled_students: int = 0
    tasks: list[TaskStats] = []


class LessonTaskStats(BaseModel):
    lesson_id: uuid.UUID
    lesson_title: str
    tasks: list[TaskStats] = []


class TaskTimelinePoint(BaseModel):
    day: date
    submissions: int
    success_count: int


class TaskStatsDetail(BaseModel):
    """Single-task detail with an optional per-day timeline."""

    stats: TaskStats
    timeline: list[TaskTimelinePoint] = []
