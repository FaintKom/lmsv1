import string

from app.assessments.models import Question, QuestionType

_PUNCT_TABLE = str.maketrans("", "", string.punctuation)


def _correct_option_texts(question: Question) -> list[str]:
    """Texts of every option marked correct."""
    if not question.options:
        return []
    return [opt.get("text") for opt in question.options if opt.get("is_correct")]


def _correct_option_text(question: Question) -> str | None:
    """Return the text of the correct option for a multiple-choice question."""
    texts = _correct_option_texts(question)
    return texts[0] if texts else None


def normalize_text(
    value: str,
    *,
    case_sensitive: bool = False,
    trim: bool = True,
    ignore_punctuation: bool = False,
) -> str:
    """Apply the author-visible text rules to one string (specs/019 US2)."""
    if trim:
        value = value.strip()
    if not case_sensitive:
        value = value.lower()
    if ignore_punctuation:
        value = value.translate(_PUNCT_TABLE)
    return value


def text_answer_matches(correct: str | None, student: str | None, rules: dict | None) -> bool:
    """One text-answer judge for every grading path (specs/019 FR-004).

    `rules` carries the author's checking settings: `case_sensitive`,
    `trim`, `ignore_punctuation`, `accepted` (variant list). Absent rules
    reproduce the pre-019 behaviour: trim + lowercase equality.
    """
    rules = rules or {}
    kwargs = {
        "case_sensitive": bool(rules.get("case_sensitive")),
        "trim": rules.get("trim", True) is not False,
        "ignore_punctuation": bool(rules.get("ignore_punctuation")),
    }
    accepted = [correct] + [
        a for a in (rules.get("accepted") or []) if isinstance(a, str) and a.strip()
    ]
    student_norm = normalize_text(student or "", **kwargs)
    if not student_norm:
        return False
    return any(a and student_norm == normalize_text(a, **kwargs) for a in accepted)


def is_answer_correct(question: Question, answer: dict | None) -> bool:
    """Whether a single student answer is correct for the given question.

    Mirrors the scoring in :func:`grade_quiz` exactly so the per-question
    breakdown stays consistent with the stored score.

    Choice questions are adaptive (specs/019 US1): several correct options
    make the question multi-choice, graded by set equality of
    `selected_options`; exactly one correct option keeps the single
    `selected_option` contract (a one-element `selected_options` list is
    tolerated). A legacy single payload against a multi question grades
    wrong rather than erroring — before 019 it wrongly passed on any one
    correct option.
    """
    if not answer:
        return False

    if question.question_type == QuestionType.multiple_choice:
        correct = {t for t in _correct_option_texts(question) if t}
        if not correct:
            return False
        if len(correct) > 1:
            selected = answer.get("selected_options")
            if not isinstance(selected, list):
                return False
            return {s for s in selected if isinstance(s, str)} == correct
        selected = answer.get("selected_option")
        if selected is None:
            listed = answer.get("selected_options")
            if isinstance(listed, list) and len(listed) == 1:
                selected = listed[0]
        return selected in correct

    if question.question_type == QuestionType.text_answer:
        # For text questions the (otherwise unused) options JSONB holds the
        # author's checking rules.
        rules = question.options if isinstance(question.options, dict) else None
        return text_answer_matches(question.correct_answer, answer.get("text"), rules)

    return False


def _student_answer_display(question: Question, answer: dict | None) -> str | None:
    """Human-readable representation of what the student answered."""
    if not answer:
        return None
    if question.question_type == QuestionType.multiple_choice:
        listed = answer.get("selected_options")
        if isinstance(listed, list) and listed:
            return " · ".join(str(s) for s in listed)
        return answer.get("selected_option")
    return answer.get("text")


def correct_answer_display(question: Question) -> str | None:
    """Human-readable representation of the correct answer."""
    if question.question_type == QuestionType.multiple_choice:
        texts = [t for t in _correct_option_texts(question) if t]
        if not texts:
            return None
        return " · ".join(texts)
    return question.correct_answer


def grade_quiz(questions: list[Question], answers: list[dict]) -> tuple[float, int]:
    """Grade a quiz submission. Returns (score_percent, total_points)."""
    answer_map = {str(a.get("question_id")): a for a in answers}

    total_points = sum(q.points for q in questions)
    earned_points = 0

    for question in questions:
        answer = answer_map.get(str(question.id))
        if is_answer_correct(question, answer):
            earned_points += question.points

    score_percent = (earned_points / total_points * 100) if total_points > 0 else 0
    return score_percent, total_points


def build_submission_breakdown(questions: list[Question], answers: list[dict]) -> list[dict]:
    """Per-question breakdown for a graded submission.

    For each question returns: prompt, type, options, the student's answer,
    the correct answer, is_correct, points and points_earned. Uses the same
    correctness comparison as :func:`grade_quiz`.
    """
    answer_map = {str(a.get("question_id")): a for a in answers}
    breakdown: list[dict] = []

    for question in questions:
        answer = answer_map.get(str(question.id))
        correct = is_answer_correct(question, answer)
        breakdown.append(
            {
                "question_id": question.id,
                "question_text": question.question_text,
                "question_type": question.question_type.value
                if hasattr(question.question_type, "value")
                else str(question.question_type),
                "options": question.options,
                "student_answer": _student_answer_display(question, answer),
                "correct_answer": correct_answer_display(question),
                "is_correct": correct,
                "points": question.points,
                "points_earned": question.points if correct else 0,
            }
        )

    return breakdown
