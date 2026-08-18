import logging
import uuid
from pathlib import Path

from fastapi import UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import User, UserRole
from app.common.auth import lesson_in_user_org
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
    result = await db.execute(select(FileSubmission).where(FileSubmission.id == submission.id))
    return result.scalar_one()


async def get_file_submissions(
    db: AsyncSession, lesson_id: uuid.UUID, user: User
) -> list[FileSubmission]:
    await lesson_in_user_org(db, lesson_id, user)
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
    result = await db.execute(select(FileSubmission).where(FileSubmission.id == submission_id))
    submission = result.scalar_one_or_none()
    if not submission:
        raise NotFoundError("File submission not found")
    # Students can only download their own files
    if user.role == UserRole.student and submission.student_id != user.id:
        raise NotFoundError("File submission not found")
    # Staff roles: enforce the tenant boundary via the lesson's org.
    if user.role != UserRole.student:
        await lesson_in_user_org(db, submission.lesson_id, user)
    return submission


# ─── Interactive grading ────────────────────────────────────────────

# per_item is a per-slot verdict map/list (booleans only — never the expected
# answer, so the /check endpoint can't be used as an answer oracle beyond
# what the deferred-check UX already reveals).
PerItem = dict[str, bool] | list[bool] | None


logger = logging.getLogger(__name__)


def _nothing_to_grade(exercise_type: str, missing: str) -> None:
    """Record that an exercise was graded against an empty answer key.

    Every `_grade_*` helper answers "full marks, passed" when its part of the
    config is empty, and that is right for content which legitimately has nothing
    to get wrong. It is also what a *misconfigured* exercise does, and there the
    school is told a class passed something nobody could attempt: on 2026-08-17 a
    crossword whose config used keys no reader understood rendered as an empty
    board and still scored 100 for anyone who pressed submit.

    Grading behaviour is deliberately unchanged — returning zero instead would
    punish students for a teacher's mistake, and the two cases cannot be told
    apart at grading time. What changes is that the silent case now leaves a
    trace somebody can find.
    """
    logger.warning(
        "exercise graded with an empty answer key — full marks awarded by default",
        extra={"exercise_type": exercise_type, "missing_config_key": missing},
    )


# Where each type keeps its answer key. Every entry names a key its grader really
# reads, and a test pins that: a wrong entry would warn about a correctly
# configured exercise, which is worse than staying quiet.
#
# The list started at nine types, the ones whose graders had been read. The first
# type outside it proved why that was not enough: a seeded bubble sheet awarded
# 100 to every submission, including an empty one, and nothing was logged
# (2026-08-18). Reading the remaining graders was a five-minute job the short list
# had deferred indefinitely.
_ANSWER_KEY_BY_TYPE = {
    "matching": "pairs",
    "ordering": "correct_order",
    "fill_blanks": "blanks",
    "categorize": "categories",
    "crossword": "words",
    "word_search": "words",
    "srs_flashcard": "cards",
    "reading": "questions",
    "conjugation": "table",
    "bubble_sheet": "questions",
    "dialogue": "messages",
    "translation": "accepted_answers",
    "sentence_builder": "correct_order",
    "map_pin_drop": "pins",
}


def _warn_if_no_answer_key(content: dict, exercise_type: str) -> None:
    key = _ANSWER_KEY_BY_TYPE.get(exercise_type)
    if key and not (content or {}).get(key):
        _nothing_to_grade(exercise_type, key)


def _as_answer_dict(answers: object) -> dict:
    """Coerce whatever a caller passed into the mapping the graders expect.

    Every `_grade_*` helper below calls `answers.get(...)`, so anything that is
    not a mapping has to become an empty one here rather than raise there.

    Callers do hand this non-dicts. `_submit_interactive` reads
    `data.get("interactive_answers") or data.get("answers", {})`: an empty dict
    is falsy, so a student who cleared their answer falls through to `answers`,
    which the submit schema declares as `list[dict] | None`. The graders then
    received a list or None, and every interactive type answered 500 instead of
    scoring zero — found 2026-08-17 across all six types of corner-case wave 1.
    Regression test: tests/test_submissions.py.
    """
    return answers if isinstance(answers, dict) else {}


def _as_value_dict(value: object) -> dict:
    """A student's answer for one key, where the grader walks it as a mapping.

    `_as_answer_dict` guards the envelope; this guards what sits inside it. The
    two were found separately: with the envelope fixed on 2026-08-17, a string
    under `words` and a list under `ratings` still reached `.get` and raised, so
    the pupil read `Internal server error` and the teacher saw nothing. An
    unusable answer now grades as an empty one, which is what a cleared answer
    already did.
    """
    return value if isinstance(value, dict) else {}


def _as_value_list(value: object) -> list:
    """Same guard, for the keys a grader iterates or indexes."""
    return value if isinstance(value, list) else []


def grade_interactive_detail(
    content: dict, exercise_type: str, answers: dict
) -> tuple[float, bool, PerItem]:
    """Like grade_interactive, but with per-item verdicts where the type
    supports them (integrity model B deferred feedback)."""
    answers = _as_answer_dict(answers)
    _warn_if_no_answer_key(content, exercise_type)
    if exercise_type == "translation":
        score, passed = _grade_translation(content, answers)
        return score, passed, None
    if exercise_type == "matching":
        return _grade_matching_detail(content, answers)
    if exercise_type == "reading":
        return _grade_reading_detail(content, answers)
    if exercise_type == "dialogue":
        return _grade_dialogue_detail(content, answers)
    if exercise_type == "crossword":
        return _grade_crossword_detail(content, answers)
    if exercise_type == "categorize":
        return _grade_categorize_detail(content, answers)
    if exercise_type == "conjugation":
        return _grade_conjugation_detail(content, answers)
    if exercise_type == "bubble_sheet":
        return _grade_bubble_sheet_detail(content, answers)
    if exercise_type == "map_pin_drop":
        return _grade_map_pin_drop_detail(content, answers)
    if exercise_type == "sentence_builder":
        return _grade_sentence_builder_detail(content, answers)
    score, passed = grade_interactive(content, exercise_type, answers)
    return score, passed, None


def grade_interactive(content: dict, exercise_type: str, answers: dict) -> tuple[float, bool]:
    """Grade interactive exercise. Returns (score 0.0-1.0, passed)."""
    answers = _as_answer_dict(answers)
    _warn_if_no_answer_key(content, exercise_type)
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
    elif exercise_type == "srs_flashcard":
        return _grade_srs_flashcard(content, answers)
    elif exercise_type == "crossword":
        return _grade_crossword(content, answers)
    elif exercise_type == "word_search":
        return _grade_word_search(content, answers)
    elif exercise_type == "map_pin_drop":
        return _grade_map_pin_drop(content, answers)
    elif exercise_type == "bubble_sheet":
        return _grade_bubble_sheet(content, answers)
    return 0.0, False


def _grade_matching(content: dict, answers: dict) -> tuple[float, bool]:
    score, passed, _ = _grade_matching_detail(content, answers)
    return score, passed


def _grade_matching_detail(content: dict, answers: dict) -> tuple[float, bool, PerItem]:
    """Grade matching. per_item = {left value: verdict} so the deferred-check
    UI can lock correct pairs and unlink wrong ones."""
    pairs = content.get("pairs", [])
    if not pairs:
        return 1.0, True, None
    student_pairs = _as_value_list(answers.get("pairs"))
    correct_map = {p["left"]: p["right"] for p in pairs}
    picked = {sp.get("left"): sp.get("right") for sp in student_pairs if isinstance(sp, dict)}
    per_item = {str(left): picked.get(left) == right for left, right in correct_map.items()}
    score = sum(per_item.values()) / len(pairs)
    return score, score >= 0.7, per_item


def _grade_ordering(content: dict, answers: dict) -> tuple[float, bool]:
    correct_order = content.get("correct_order", [])
    student_order = _as_value_list(answers.get("order"))
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
    student_blanks = _as_value_list(answers.get("blanks"))
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
    score, passed, _ = _grade_categorize_detail(content, answers)
    return score, passed


def _grade_categorize_detail(content: dict, answers: dict) -> tuple[float, bool, PerItem]:
    """Grade categorize. per_item = {item: verdict} — an item counts correct
    only when it sits in the bucket its config category names."""
    categories = content.get("categories", [])
    student_categories = _as_value_dict(answers.get("categories"))
    if not categories:
        return 1.0, True, None
    # item -> where the student put it
    placed: dict[str, str] = {}
    for cat_name, items in (student_categories or {}).items():
        for item in items or []:
            placed[str(item)] = str(cat_name)
    per_item: dict[str, bool] = {}
    for cat in categories:
        cat_name = str(cat["name"])
        for item in cat.get("items") or []:
            per_item[str(item)] = placed.get(str(item)) == cat_name
    total = len(per_item)
    score = sum(per_item.values()) / total if total > 0 else 1.0
    return score, score >= 0.7, per_item


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
    score, passed, _ = _grade_sentence_builder_detail(content, answers)
    return score, passed


def _grade_sentence_builder_detail(content: dict, answers: dict) -> tuple[float, bool, PerItem]:
    """Grade sentence builder — compare word order. per_item = verdict per position."""
    correct = content.get("correct_order", [])
    student = answers.get("word_order", [])
    if not correct:
        return 1.0, True, None
    if len(student) != len(correct):
        return 0.0, False, [False] * len(correct)
    per_item = [a == b for a, b in zip(student, correct)]
    score = sum(per_item) / len(correct)
    return score, score >= 0.7, per_item


def _grade_dialogue(content: dict, answers: dict) -> tuple[float, bool]:
    score, passed, _ = _grade_dialogue_detail(content, answers)
    return score, passed


def _grade_dialogue_detail(content: dict, answers: dict) -> tuple[float, bool, PerItem]:
    """Grade dialogue — check selected options. per_item = {message index: verdict}.

    Each message may have `options` as either:
      - a list of strings (label-only, no correctness marker; a matching
        pick counts as correct)
      - a list of dicts {id, label, is_correct?} (correctness marker
        drives the grade)
    """
    messages = content.get("messages") or []
    selections = _as_value_dict(answers.get("selections"))
    per_item: dict[str, bool] = {}
    for i, msg in enumerate(messages):
        options = (msg or {}).get("options")
        if not options:
            continue
        selected = selections.get(str(i))
        ok = False
        if selected is not None:
            for opt in options:
                if isinstance(opt, str):
                    if selected == opt:
                        ok = True
                        break
                elif isinstance(opt, dict):
                    if opt.get("id") == selected and opt.get("is_correct"):
                        ok = True
                        break
        per_item[str(i)] = ok
    if not per_item:
        return 1.0, True, None
    score = sum(per_item.values()) / len(per_item)
    return score, score >= 0.7, per_item


def _grade_conjugation(content: dict, answers: dict) -> tuple[float, bool]:
    score, passed, _ = _grade_conjugation_detail(content, answers)
    return score, passed


def _grade_conjugation_detail(content: dict, answers: dict) -> tuple[float, bool, PerItem]:
    """Grade conjugation table — compare each row. per_item = {pronoun: verdict}.

    accent_forgiving (default True, mirrors the V2 component): answers that
    differ from the correct form only by accents still count.
    """
    import unicodedata

    forgiving = content.get("accent_forgiving", True)

    def _norm(s: str) -> str:
        s = " ".join(s.strip().lower().split())
        if forgiving:
            s = "".join(c for c in unicodedata.normalize("NFD", s) if not unicodedata.combining(c))
        return s

    table = content.get("table", [])
    student_answers = _as_value_dict(answers.get("conjugations"))  # {pronoun: answer}
    if not table:
        return 1.0, True, None
    per_item: dict[str, bool] = {}
    for row in table:
        pronoun = row.get("pronoun", "")
        per_item[pronoun] = _norm(student_answers.get(pronoun) or "") == _norm(
            row.get("correct") or ""
        )
    score = sum(per_item.values()) / len(table)
    return score, score >= 0.7, per_item


def _grade_reading(content: dict, answers: dict) -> tuple[float, bool]:
    score, passed, _ = _grade_reading_detail(content, answers)
    return score, passed


def _grade_reading_detail(content: dict, answers: dict) -> tuple[float, bool, PerItem]:
    """Grade reading comprehension. per_item = {question index: verdict}.

    Each question may have `options` as either:
      - a list of strings (compare student answer directly to
        `correct_answer` from the question)
      - a list of dicts {id, label, is_correct} (id-based check)
    """
    questions = content.get("questions") or []
    student_answers = _as_value_dict(answers.get("answers"))
    if not questions:
        return 1.0, True, None
    per_item: dict[str, bool] = {}
    for i, q in enumerate(questions):
        if not isinstance(q, dict):
            continue
        student = student_answers.get(str(i), "")
        q_type = q.get("type")
        matched = False
        if q_type == "multiple_choice":
            options = q.get("options") or []
            expected_answer = (q.get("correct_answer") or "").strip().lower()
            student_str = (student or "").strip().lower()
            for opt in options:
                if isinstance(opt, str):
                    # Label-only fixture: compare student pick to correct_answer.
                    if student_str and student_str == expected_answer:
                        matched = True
                        break
                elif isinstance(opt, dict):
                    if opt.get("id") == student and opt.get("is_correct"):
                        matched = True
                        break
        elif q_type == "text":
            expected = (q.get("correct_answer") or "").strip().lower()
            matched = (student or "").strip().lower() == expected
        per_item[str(i)] = matched
    score = sum(per_item.values()) / len(questions)
    return score, score >= 0.7, per_item


def _grade_srs_flashcard(content: dict, answers: dict) -> tuple[float, bool]:
    """Grade SRS flashcards — pass if student rated all cards good or easy."""
    cards = content.get("cards", [])
    ratings = _as_value_dict(answers.get("ratings"))
    if not cards:
        return 1.0, True
    good_ratings = {"good", "easy"}
    mastered = sum(1 for i in range(len(cards)) if ratings.get(str(i), "") in good_ratings)
    score = mastered / len(cards)
    threshold = content.get("mastery_threshold", 0.7)
    return score, score >= threshold


def _grade_crossword(content: dict, answers: dict) -> tuple[float, bool]:
    score, passed, _ = _grade_crossword_detail(content, answers)
    return score, passed


def _grade_crossword_detail(content: dict, answers: dict) -> tuple[float, bool, PerItem]:
    """Grade crossword. per_item = {word index: verdict}."""
    words = content.get("words", [])
    student_words = _as_value_dict(answers.get("words"))
    if not words:
        return 1.0, True, None
    per_item: dict[str, bool] = {}
    for i, w in enumerate(words):
        expected = (w.get("word") or "").strip().lower()
        given = (student_words.get(str(i)) or "").strip().lower()
        per_item[str(i)] = given == expected
    score = sum(per_item.values()) / len(words)
    return score, score >= 0.7, per_item


def _grade_word_search(content: dict, answers: dict) -> tuple[float, bool]:
    """Grade word search — check how many hidden words were found."""
    hidden_words = content.get("words", [])
    found = _as_value_list(answers.get("found_words"))
    if not hidden_words:
        return 1.0, True
    expected_set = {w.strip().lower() for w in hidden_words}
    found_set = {w.strip().lower() for w in found}
    correct = len(expected_set & found_set)
    score = correct / len(expected_set)
    return score, score >= 0.7


def _grade_map_pin_drop(content: dict, answers: dict) -> tuple[float, bool]:
    score, passed, _ = _grade_map_pin_drop_detail(content, answers)
    return score, passed


def _grade_map_pin_drop_detail(content: dict, answers: dict) -> tuple[float, bool, PerItem]:
    """Grade map pin drop — pins within tolerance. per_item = verdict per pin."""
    pins = content.get("pins", [])
    student_pins = _as_value_list(answers.get("pins"))
    if not pins:
        return 1.0, True, None
    per_item: list[bool] = []
    for i, pin in enumerate(pins):
        if i >= len(student_pins):
            per_item.append(False)
            continue
        sp = student_pins[i]
        if not isinstance(sp, dict):
            per_item.append(False)
            continue
        dx = sp.get("x", 0) - pin.get("x", 0)
        dy = sp.get("y", 0) - pin.get("y", 0)
        dist = (dx**2 + dy**2) ** 0.5
        tolerance = pin.get("tolerance", 30)
        per_item.append(dist <= tolerance)
    score = sum(per_item) / len(pins)
    return score, score >= 0.7, per_item


def _grade_bubble_sheet(content: dict, answers: dict) -> tuple[float, bool]:
    score, passed, _ = _grade_bubble_sheet_detail(content, answers)
    return score, passed


def _grade_bubble_sheet_detail(content: dict, answers: dict) -> tuple[float, bool, PerItem]:
    """Grade bubble sheet — standard MC answer sheet. per_item = {index: verdict}."""
    questions = content.get("questions", [])
    student_answers = _as_value_dict(answers.get("answers"))
    if not questions:
        return 1.0, True, None
    per_item: dict[str, bool] = {}
    for i, q in enumerate(questions):
        expected = q.get("correct", "").strip().upper()
        given = (student_answers.get(str(i)) or "").strip().upper()
        per_item[str(i)] = given == expected
    score = sum(per_item.values()) / len(questions)
    passing = content.get("passing_score", 70) / 100
    return score, score >= passing, per_item


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
    await lesson_in_user_org(db, lesson_id, user)
    query = select(InteractiveSubmission).where(InteractiveSubmission.lesson_id == lesson_id)
    if user.role == UserRole.student:
        query = query.where(InteractiveSubmission.student_id == user.id)
    query = query.order_by(InteractiveSubmission.created_at.desc())
    result = await db.execute(query)
    return list(result.scalars().all())
