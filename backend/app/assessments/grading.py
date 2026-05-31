from app.assessments.models import Question, QuestionType


def _correct_option_text(question: Question) -> str | None:
    """Return the text of the correct option for a multiple-choice question."""
    if not question.options:
        return None
    for opt in question.options:
        if opt.get("is_correct"):
            return opt.get("text")
    return None


def is_answer_correct(question: Question, answer: dict | None) -> bool:
    """Whether a single student answer is correct for the given question.

    Mirrors the scoring in :func:`grade_quiz` exactly so the per-question
    breakdown stays consistent with the stored score.
    """
    if not answer:
        return False

    if question.question_type == QuestionType.multiple_choice:
        selected = answer.get("selected_option")
        if question.options:
            for opt in question.options:
                if opt.get("text") == selected and opt.get("is_correct"):
                    return True
        return False

    if question.question_type == QuestionType.text_answer:
        text = (answer.get("text") or "").strip().lower()
        correct = (question.correct_answer or "").strip().lower()
        return bool(correct) and text == correct

    return False


def _student_answer_display(question: Question, answer: dict | None) -> str | None:
    """Human-readable representation of what the student answered."""
    if not answer:
        return None
    if question.question_type == QuestionType.multiple_choice:
        return answer.get("selected_option")
    return answer.get("text")


def correct_answer_display(question: Question) -> str | None:
    """Human-readable representation of the correct answer."""
    if question.question_type == QuestionType.multiple_choice:
        return _correct_option_text(question)
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
