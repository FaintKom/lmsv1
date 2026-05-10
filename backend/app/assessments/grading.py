from app.assessments.models import Question, QuestionType


def grade_quiz(questions: list[Question], answers: list[dict]) -> tuple[float, int]:
    """Grade a quiz submission. Returns (score_percent, total_points)."""
    answer_map = {str(a.get("question_id")): a for a in answers}

    total_points = sum(q.points for q in questions)
    earned_points = 0

    for question in questions:
        answer = answer_map.get(str(question.id))
        if not answer:
            continue

        if question.question_type == QuestionType.multiple_choice:
            selected = answer.get("selected_option")
            if question.options:
                for opt in question.options:
                    if opt.get("text") == selected and opt.get("is_correct"):
                        earned_points += question.points
                        break

        elif question.question_type == QuestionType.text_answer:
            text = (answer.get("text") or "").strip().lower()
            correct = (question.correct_answer or "").strip().lower()
            if text == correct:
                earned_points += question.points

    score_percent = (earned_points / total_points * 100) if total_points > 0 else 0
    return score_percent, total_points
