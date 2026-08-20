"""Taking a deleted thing's block off the lesson pages that showed it.

A lesson page holds references, not content: an exercise appears as
``{"type": "exercise", "exercise_id": ...}``. Delete the exercise and the
reference stays, pointing at nothing — and nothing tells anyone. The pupil's
player skips a block it cannot resolve, so the lesson quietly gets shorter;
the teacher's editor reads it as a block whose type was never picked.

Four such blocks were found in production, in published maths courses, each
in a lesson authored with two exercises and showing one.

Lives in ``courses`` rather than ``exercises`` because what it edits is
lessons, and because both exercise and assignment deletion call it.
"""

import uuid

import sqlalchemy as sa
from sqlalchemy import Select, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.courses.models import Course, Lesson, Module


def lessons_holding(org_id: uuid.UUID, ref_id: str) -> Select:
    """The lessons of one school whose stored content mentions this id.

    A text match on the JSON is a *filter*, not the decision: a uuid appearing
    in the content is near-certain evidence of a reference, and the authority
    on whether there really is one is :func:`content_without_block`, which
    reports "nothing removed" and leaves the row alone. That keeps one copy of
    the rule about what a block looks like, in Python, instead of a second one
    written in jsonpath.

    ``FOR UPDATE OF lessons`` is what makes concurrent deletions safe. The
    cleanup is read-modify-write on one JSON column, so two deletions landing
    in the same lesson would otherwise race and the later write would drop the
    earlier one's removal. Not hypothetical: 21 of the 24 unusable exercises
    being retired from production sit in a single lesson.
    """
    return (
        select(Lesson)
        .join(Module, Module.id == Lesson.module_id)
        .join(Course, Course.id == Module.course_id)
        .where(Course.org_id == org_id)
        .where(sa.cast(Lesson.content, sa.Text).contains(ref_id))
        # Always lock in the same order. Two exercises can share two lessons,
        # and two deletions taking those locks in opposite orders deadlock —
        # which is precisely the shape of a bulk cleanup.
        .order_by(Lesson.id)
        .with_for_update(of=Lesson)
    )


def content_without_block(
    content: object, block_type: str, ref_field: str, ref_id: str
) -> dict | None:
    """Lesson content with every block referencing ``ref_id`` taken out.

    Returns ``None`` when there was nothing to remove — including when the
    content is not pages at all. The caller uses that to leave the row
    untouched, so a lesson that never showed the thing is not rewritten just
    because its text happened to match the filter.

    ``sort_order`` and ``page`` are re-derived from position, the same rule
    ``buildPagesContent`` applies in the editor. They are not fields anyone
    edits; a lesson closed up by this function and a lesson saved by the
    editor have to be the same lesson.

    Pages are never dropped, even when emptied. A page is a screen the teacher
    put there; removing it would be a change to the lesson's structure that
    nobody asked for.
    """
    if not isinstance(content, dict) or content.get("version") != 3:
        return None
    raw_pages = content.get("pages")
    if not isinstance(raw_pages, list):
        return None

    removed = False
    rebuilt_pages: list[object] = []
    for index, page in enumerate(raw_pages):
        if not isinstance(page, dict):
            rebuilt_pages.append(page)
            continue

        blocks = page.get("blocks")
        kept: list[object] = []
        for candidate in blocks if isinstance(blocks, list) else []:
            if (
                isinstance(candidate, dict)
                and candidate.get("type") == block_type
                and candidate.get(ref_field) == ref_id
            ):
                removed = True
                continue
            kept.append(candidate)

        rebuilt_pages.append(
            {
                **page,
                "blocks": [
                    {**b, "sort_order": i, "page": index + 1} if isinstance(b, dict) else b
                    for i, b in enumerate(kept)
                ],
            }
        )

    if not removed:
        return None
    return {**content, "version": 3, "pages": rebuilt_pages}


async def remove_block_references(
    db: AsyncSession,
    org_id: uuid.UUID,
    block_type: str,
    ref_field: str,
    ref_id: uuid.UUID,
) -> int:
    """Take the deleted thing off every page of this school that showed it.

    Call this *before* deleting the row: the school is read off the object
    being deleted, and after ``db.delete`` it is no longer there to read. Runs
    in the caller's transaction, so the pages and the row go together or
    neither does.

    Returns how many lessons were actually rewritten — useful to a caller that
    wants to log it, ignorable otherwise.
    """
    reference = str(ref_id)
    lessons = (await db.execute(lessons_holding(org_id, reference))).scalars().all()

    rewritten = 0
    for lesson in lessons:
        closed = content_without_block(lesson.content, block_type, ref_field, reference)
        if closed is None:
            continue
        # A new object, not a mutation: Lesson.content is plain JSONB without
        # MutableDict, so editing the nested dict in place would leave the
        # attribute clean and the flush would write nothing at all.
        lesson.content = closed
        rewritten += 1

    if rewritten:
        await db.flush()
    return rewritten
