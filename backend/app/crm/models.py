"""School-side CRM: the funnel that runs before a student exists.

Not to be confused with ``app.waitlist``, which is *our* funnel — schools
interested in GrassLMS, visible to the super admin only. These rows belong to
a school and never leave it.

A lead is one enquiry: somebody wrote in about somebody learning something.
For the schools this is built for — 10 to 300 pupils, taught programming,
maths or languages — that is almost always one parent asking about one child,
so it is one row rather than a contact entity with deals hanging off it. The
adult's details and the child's name sit side by side; when the enquiry is
won, both can become accounts.

``stage`` and ``source`` are plain strings, not PG enums, for the reason
spelled out in ``billing.models.BillingProvider``: a Postgres enum only grows,
so adding "waiting list" or "referral" later would cost a migration. The
allowed values live in Python where they are cheap to change.
"""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, IDMixin, TimestampMixin

# The pipeline, in order. `won` and `lost` are terminal.
LEAD_STAGES: tuple[str, ...] = (
    "new",
    "contacted",
    "trial_scheduled",
    "trial_done",
    "won",
    "lost",
)
TERMINAL_STAGES: frozenset[str] = frozenset({"won", "lost"})

# Where the enquiry came from. These are what the UI offers and what any
# later reporting groups by.
LEAD_SOURCES: tuple[str, ...] = (
    "website",
    "referral",
    "social",
    "walk_in",
    "phone",
    "other",
)

# What a row in the lead's history can be.
EVENT_KINDS: tuple[str, ...] = (
    "created",
    "stage_changed",
    "note",
    "call",
    "email",
    "converted",
    # A lost enquiry that came back. Kept as a distinct kind rather than
    # another stage_changed, because "they returned" is the thing a school
    # reads a history to find.
    "reopened",
)


class Lead(Base, IDMixin, TimestampMixin):
    """One enquiry, from first contact to enrolled or lost."""

    __tablename__ = "crm_leads"
    __table_args__ = (
        # The board reads one school's leads grouped by stage.
        Index("ix_crm_leads_org_stage", "org_id", "stage"),
    )

    org_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Whoever wrote in. For a children's school this is the parent.
    contact_name: Mapped[str] = mapped_column(String(255), nullable=False)
    contact_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    contact_phone: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # Who would actually attend. Blank when an adult is enquiring for
    # themselves — conversion then falls back to the contact's name.
    student_name: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # What they asked about. Optional: plenty of enquiries are "do you teach
    # Python?" before any course is picked.
    interest_course_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("courses.id", ondelete="SET NULL"), nullable=True
    )
    interest_note: Mapped[str | None] = mapped_column(String(500), nullable=True)

    stage: Mapped[str] = mapped_column(String(30), nullable=False, default="new")
    source: Mapped[str | None] = mapped_column(String(30), nullable=True)

    # The staff member carrying this one. Nullable: a school of three does not
    # always bother assigning.
    owner_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    # Why it was lost — the one field in here that improves next term's
    # decisions, so it is asked for explicitly rather than left to notes.
    lost_reason: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # Set when the lead becomes a real pupil, so a won lead links to the
    # account it produced.
    converted_student_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    converted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    events: Mapped[list["LeadEvent"]] = relationship(
        back_populates="lead", cascade="all, delete-orphan"
    )
    tasks: Mapped[list["LeadTask"]] = relationship(
        back_populates="lead", cascade="all, delete-orphan"
    )


class LeadEvent(Base, IDMixin, TimestampMixin):
    """One line of a lead's history.

    Append-only. A pipeline with no record of what was said and when is a
    spreadsheet with extra steps — and the reason schools keep the WhatsApp
    thread open beside the tool they paid for.
    """

    __tablename__ = "crm_lead_events"
    __table_args__ = (Index("ix_crm_lead_events_lead_created", "lead_id", "created_at"),)

    lead_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("crm_leads.id", ondelete="CASCADE"), nullable=False
    )
    author_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    kind: Mapped[str] = mapped_column(String(30), nullable=False, default="note")
    body: Mapped[str | None] = mapped_column(Text, nullable=True)

    lead: Mapped[Lead] = relationship(back_populates="events")


class LeadTask(Base, IDMixin, TimestampMixin):
    """A reminder against a lead — "ring back on Tuesday".

    Enquiries are lost to silence more often than to competitors, so the due
    date is the point: a nightly job notifies the assignee about anything due
    today or already overdue.
    """

    __tablename__ = "crm_tasks"
    __table_args__ = (
        # The reminder sweep reads open tasks by due date across all schools.
        Index("ix_crm_tasks_due_open", "due_at", "done_at"),
    )

    lead_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("crm_leads.id", ondelete="CASCADE"), nullable=False
    )
    org_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    assignee_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    title: Mapped[str] = mapped_column(String(255), nullable=False)
    due_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    done_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Set once the reminder has gone out, so a task overdue for a week does not
    # notify every single night.
    notified: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    lead: Mapped[Lead] = relationship(back_populates="tasks")
