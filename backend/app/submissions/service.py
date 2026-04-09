import uuid
from pathlib import Path

from fastapi import UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import User, UserRole
from app.common.exceptions import BadRequestError, NotFoundError
from app.common.file_validation import (
    SUBMISSION_EXTENSIONS,
    UploadValidationError,
    validate_upload,
)
from app.config import settings
from app.courses.models import Lesson
from app.submissions.models import FileSubmission, InteractiveSubmission


async def _get_lesson(db: AsyncSession, lesson_id: uuid.UUID) -> Lesson:
    result = await db.execute(select(Lesson).where(Lesson.id == lesson_id))
    lesson = result.scalar_one_or_none()
    if not lesson:
        raise NotFoundError("Lesson not found")
    return lesson


async def upload_file(
    db: AsyncSession, lesson_id: uuid.UUID, user: User, file: UploadFile
) -> FileSubmission:
    lesson = await _get_lesson(db, lesson_id)
    content = lesson.content or {}

    # Read once and delegate to shared validator (extension, size, magic bytes, safe name)
    raw = await file.read()
    allowed = content.get("allowed_types", list(SUBMISSION_EXTENSIONS))
    max_mb = content.get("max_file_mb", settings.max_upload_mb)
    try:
        validated = validate_upload(
            filename=file.filename,
            data=raw,
            allowed_extensions=allowed,
            max_size_mb=max_mb,
        )
    except UploadValidationError as e:
        raise BadRequestError(str(e)) from e

    original = file.filename or validated.safe_name
    stored_name = validated.safe_name
    upload_dir = Path(settings.upload_dir) / str(user.org_id) / str(lesson_id)
    upload_dir.mkdir(parents=True, exist_ok=True)
    file_path = upload_dir / stored_name

    with open(file_path, "wb") as f:
        f.write(validated.data)

    submission = FileSubmission(
        student_id=user.id,
        lesson_id=lesson_id,
        original_filename=original,
        stored_filename=stored_name,
        file_path=str(file_path),
        file_size=validated.size,
        mime_type=validated.verified_mime,
    )
    db.add(submission)
    await db.flush()

    # Reload to get created_at
    result = await db.execute(
        select(FileSubmission).where(FileSubmission.id == submission.id)
    )
    return result.scalar_one()


async def get_file_submissions(
    db: AsyncSession, lesson_id: uuid.UUID, user: User
) -> list[FileSubmission]:
    query = select(FileSubmission).where(FileSubmission.lesson_id == lesson_id)
    # Students see only their own
    if user.role == UserRole.student:
        query = query.where(FileSubmission.student_id == user.id)
    query = query.order_by(FileSubmission.created_at.desc())
    result = await db.execute(query)
    return list(result.scalars().all())


async def get_file_submission(
    db: AsyncSession, submission_id: uuid.UUID, user: User
) -> FileSubmission:
    result = await db.execute(
        select(FileSubmission).where(FileSubmission.id == submission_id)
    )
    submission = result.scalar_one_or_none()
    if not submission:
        raise NotFoundError("File submission not found")
    # Students can only download their own files
    if user.role == UserRole.student and submission.student_id != user.id:
        raise NotFoundError("File submission not found")
    return submission


# ─── Interactive grading ────────────────────────────────────────────

def grade_interactive(content: dict, exercise_type: str, answers: dict) -> tuple[float, bool]:
    """Grade interactive exercise. Returns (score 0.0-1.0, passed)."""
    if exercise_type == "matching":
        return _grade_matching(content, answers)
    elif exercise_type == "ordering":
        return _grade_ordering(content, answers)
    elif exercise_type == "fill_blanks":
        return _grade_fill_blanks(content, answers)
    elif exercise_type == "true_false":
        return _grade_true_false(content, answers)
    elif exercise_type == "categorize":
        return _grade_categorize(content, answers)
    elif exercise_type == "translation":
        return _grade_translation(content, answers)
    elif exercise_type == "sentence_builder":
        return _grade_sentence_builder(content, answers)
    elif exercise_type == "dialogue":
        return _grade_dialogue(content, answers)
    elif exercise_type == "conjugation":
        return _grade_conjugation(content, answers)
    elif exercise_type == "reading":
        return _grade_reading(content, answers)
    return 0.0, False


def _grade_matching(content: dict, answers: dict) -> tuple[float, bool]:
    pairs = content.get("pairs", [])
    if not pairs:
        return 1.0, True
    student_pairs = answers.get("pairs", [])
    correct = 0
    correct_map = {p["left"]: p["right"] for p in pairs}
    for sp in student_pairs:
        if correct_map.get(sp.get("left")) == sp.get("right"):
            correct += 1
    score = correct / len(pairs)
    return score, score >= 0.7


def _grade_ordering(content: dict, answers: dict) -> tuple[float, bool]:
    correct_order = content.get("correct_order", [])
    student_order = answers.get("order", [])
    if not correct_order:
        return 1.0, True
    if student_order == correct_order:
        return 1.0, True
    # Partial credit: count items in correct position
    correct = sum(1 for a, b in zip(student_order, correct_order) if a == b)
    score = correct / len(correct_order)
    return score, score >= 0.7


def _grade_fill_blanks(content: dict, answers: dict) -> tuple[float, bool]:
    blanks = content.get("blanks", [])
    student_blanks = answers.get("blanks", [])
    if not blanks:
        return 1.0, True
    correct = 0
    for i, expected in enumerate(blanks):
        student_ans = student_blanks[i] if i < len(student_blanks) else ""
        if student_ans.strip().lower() == expected.strip().lower():
            correct += 1
    score = correct / len(blanks)
    return score, score >= 0.7


def _grade_true_false(content: dict, answers: dict) -> tuple[float, bool]:
    correct_answer = content.get("correct_answer")
    student_answer = answers.get("answer")
    if student_answer == correct_answer:
        return 1.0, True
    return 0.0, False


def _grade_categorize(content: dict, answers: dict) -> tuple[float, bool]:
    categories = content.get("categories", [])
    student_categories = answers.get("categories", {})
    if not categories:
        return 1.0, True
    total = 0
    correct = 0
    for cat in categories:
        cat_name = cat["name"]
        correct_items = set(cat["items"])
        student_items = set(student_categories.get(cat_name, []))
        total += len(correct_items)
        correct += len(correct_items & student_items)
    score = correct / total if total > 0 else 1.0
    return score, score >= 0.7


def _grade_translation(content: dict, answers: dict) -> tuple[float, bool]:
    """Grade translation exercise. Fuzzy match against accepted answers."""
    student = (answers.get("translation") or "").strip()
    accepted = content.get("accepted_answers", [])
    case_sensitive = content.get("case_sensitive", False)

    if not student or not accepted:
        return 0.0, False

    if not case_sensitive:
        student = student.lower()
        accepted = [a.lower() for a in accepted]

    # Exact match
    if student in accepted:
        return 1.0, True

    # Fuzzy match — simple character-level similarity
    best_score = 0.0
    for answer in accepted:
        # Levenshtein-like similarity
        longer = max(len(student), len(answer))
        if longer == 0:
            continue
        common = sum(1 for a, b in zip(student, answer) if a == b)
        similarity = common / longer
        best_score = max(best_score, similarity)

    return best_score, best_score >= 0.8


def _grade_sentence_builder(content: dict, answers: dict) -> tuple[float, bool]:
    """Grade sentence builder — compare word order."""
    correct = content.get("correct_order", [])
    student = answers.get("word_order", [])
    if not correct:
        return 1.0, True
    if len(student) != len(correct):
        return 0.0, False
    matches = sum(1 for a, b in zip(student, correct) if a == b)
    score = matches / len(correct)
    return score, score >= 0.7


def _grade_dialogue(content: dict, answers: dict) -> tuple[float, bool]:
    """Grade dialogue — check selected options."""
    messages = content.get("messages", [])
    selections = answers.get("selections", {})  # {message_index: selected_option_id}
    total = 0
    correct = 0
    for i, msg in enumerate(messages):
        options = msg.get("options")
        if not options:
            continue
        total += 1
        selected = selections.get(str(i))
        for opt in options:
            if opt.get("id") == selected and opt.get("is_correct"):
                correct += 1
                break
    if total == 0:
        return 1.0, True
    score = correct / total
    return score, score >= 0.7


def _grade_conjugation(content: dict, answers: dict) -> tuple[float, bool]:
    """Grade conjugation table — compare each row."""
    table = content.get("table", [])
    student_answers = answers.get("conjugations", {})  # {pronoun: answer}
    if not table:
        return 1.0, True
    correct = 0
    for row in table:
        pronoun = row.get("pronoun", "")
        expected = (row.get("correct") or "").strip().lower()
        given = (student_answers.get(pronoun) or "").strip().lower()
        if given == expected:
            correct += 1
    score = correct / len(table)
    return score, score >= 0.7


def _grade_reading(content: dict, answers: dict) -> tuple[float, bool]:
    """Grade reading comprehension — grade each question."""
    questions = content.get("questions", [])
    student_answers = answers.get("answers", {})  # {question_index: answer}
    if not questions:
        return 1.0, True
    correct = 0
    for i, q in enumerate(questions):
        student = student_answers.get(str(i), "")
        if q.get("type") == "multiple_choice":
            options = q.get("options", [])
            for opt in options:
                if opt.get("id") == student and opt.get("is_correct"):
                    correct += 1
                    break
        elif q.get("type") == "text":
            expected = (q.get("correct_answer") or "").strip().lower()
            given = (student or "").strip().lower()
            if given == expected:
                correct += 1
    score = correct / len(questions)
    return score, score >= 0.7


async def submit_interactive(
    db: AsyncSession, lesson_id: uuid.UUID, user: User, data: dict
) -> InteractiveSubmission:
    lesson = await _get_lesson(db, lesson_id)
    content = lesson.content or {}
    exercise_type = data["exercise_type"]

    score, passed = grade_interactive(content, exercise_type, data["answers"])

    submission = InteractiveSubmission(
        student_id=user.id,
        lesson_id=lesson_id,
        exercise_type=exercise_type,
        answers=data["answers"],
        score=round(score, 4),
        passed=passed,
    )
    db.add(submission)
    await db.flush()

    result = await db.execute(
        select(InteractiveSubmission).where(InteractiveSubmission.id == submission.id)
    )
    return result.scalar_one()


async def get_interactive_submissions(
    db: AsyncSession, lesson_id: uuid.UUID, user: User
) -> list[InteractiveSubmission]:
    query = (
        select(InteractiveSubmission)
        .where(InteractiveSubmission.lesson_id == lesson_id)
    )
    if user.role == UserRole.student:
        query = query.where(InteractiveSubmission.student_id == user.id)
    query = query.order_by(InteractiveSubmission.created_at.desc())
    result = await db.execute(query)
    return list(result.scalars().all())
