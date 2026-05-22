"""Student happy path: log in -> see enrolled QA Course -> see exercises
-> submit the seeded quiz with correct answer -> score 100."""
from .conftest import QA_COURSE_ID, QA_LESSON_ID


async def test_student_sees_enrolled_qa_course(role_client_factory):
    c = await role_client_factory("student")
    r = await c.get("/api/v1/progress/my-courses")
    assert r.status_code == 200, r.text
    enrollments = r.json()
    # EnrollmentResponse is flat: {id, course_id, student_id, progress_percent, ...}
    course_ids = [e["course_id"] for e in enrollments]
    assert str(QA_COURSE_ID) in course_ids, f"QA Course not in {course_ids}"


async def test_student_sees_24_exercises_in_qa_lesson(role_client_factory):
    c = await role_client_factory("student")
    r = await c.get(f"/api/v1/exercises/by-lesson/{QA_LESSON_ID}")
    assert r.status_code == 200, r.text
    exercises = r.json()
    assert len(exercises) == 24, (
        f"expected 24, got {len(exercises)}: {[e['exercise_type'] for e in exercises]}"
    )


async def test_student_submits_quiz_correctly_and_scores_100(role_client_factory):
    c = await role_client_factory("student")

    # Fetch the seeded quiz exercise (the only one with a Question child).
    r = await c.get(f"/api/v1/exercises/by-lesson/{QA_LESSON_ID}")
    assert r.status_code == 200, r.text
    exercises = r.json()
    quiz = next((e for e in exercises if e["exercise_type"] == "quiz"), None)
    assert quiz is not None, f"no quiz in {[e['exercise_type'] for e in exercises]}"

    # Need the Question id to construct the submission.
    r = await c.get(f"/api/v1/exercises/{quiz['id']}")
    assert r.status_code == 200, r.text
    detail = r.json()
    questions = detail.get("questions") or []
    assert len(questions) == 1, f"expected 1 question, got {questions}"
    q = questions[0]

    # Backend strips `is_correct` from options returned to students (good
    # security). Submission expects `selected_option` to equal the option's
    # `text` (not its array index) - see app/assessments/grading.py.
    # The seed fixture quiz options are [{text:"3"},{text:"4"}] with "4"
    # marked correct.
    CORRECT_TEXT = "4"

    r = await c.post(
        f"/api/v1/exercises/{quiz['id']}/submit",
        json={"answers": [{"question_id": q["id"], "selected_option": CORRECT_TEXT}]},
    )
    assert r.status_code == 200, r.text
    sub = r.json()
    assert sub["score"] == 100, f"score {sub['score']}, body={sub}"
    assert sub["passed"] is True


async def test_student_submits_quiz_wrong_and_scores_zero(role_client_factory):
    c = await role_client_factory("student")
    r = await c.get(f"/api/v1/exercises/by-lesson/{QA_LESSON_ID}")
    exercises = r.json()
    quiz = next(e for e in exercises if e["exercise_type"] == "quiz")
    r = await c.get(f"/api/v1/exercises/{quiz['id']}")
    detail = r.json()
    q = detail["questions"][0]

    WRONG_TEXT = "3"  # see comment in test above; "3" is the wrong option

    r = await c.post(
        f"/api/v1/exercises/{quiz['id']}/submit",
        json={"answers": [{"question_id": q["id"], "selected_option": WRONG_TEXT}]},
    )
    assert r.status_code == 200, r.text
    sub = r.json()
    assert sub["score"] < 100, f"score {sub['score']}, body={sub}"
