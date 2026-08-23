import uuid

from fastapi import APIRouter, Depends, File, HTTPException, Query, Request, Response, UploadFile
from fastapi.responses import FileResponse, JSONResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user, require_role
from app.auth.models import User, UserRole
from app.common.rate_limit import limiter
from app.config import settings
from app.db.session import get_db
from app.exercises.models import ExerciseType
from app.exercises.schemas import (
    CheckExerciseRequest,
    CheckExerciseResponse,
    ExerciseCreate,
    ExerciseListResponse,
    ExerciseResponse,
    ExerciseSubmissionResponse,
    ExerciseUpdate,
    QuestionCreate,
    QuestionInExercise,
    QuestionUpdate,
    RobotPreviewRequest,
    RobotRunRequest,
    RobotRunResponse,
    RobotSolveRequest,
    RobotSolveResponse,
    SubmissionListResponse,
    SubmitExerciseRequest,
    TestCaseCreate,
    TestCaseInExercise,
    TestCaseUpdate,
    WorldPreviewRequest,
    WorldRunRequest,
    WorldRunResponse,
    WorldSolveRequest,
    WorldSolveResponse,
)
from app.exercises.service import (
    add_question_to_exercise,
    add_test_case_to_exercise,
    create_exercise,
    delete_exercise,
    delete_question_from_exercise,
    delete_test_case_from_exercise,
    get_attempt_status,
    get_exercise,
    get_exercises_by_lesson,
    list_exercises,
    list_submissions,
    placed_exercise_ids,
    submit_exercise,
    update_exercise,
    update_question_in_exercise,
    update_test_case_in_exercise,
    upload_file_submission,
)
from app.live_lessons.schemas import DraftRequest

router = APIRouter()


# ─── Exercise CRUD ───────────────────────────────────────────────────


@router.post("", response_model=ExerciseResponse)
async def create_exercise_endpoint(
    data: ExerciseCreate,
    user: User = Depends(require_role(UserRole.admin, UserRole.teacher)),
    db: AsyncSession = Depends(get_db),
):
    exercise = await create_exercise(db, user, data.model_dump())
    return _for_reader(exercise, user)


@router.get("", response_model=ExerciseListResponse)
async def list_exercises_endpoint(
    exercise_type: ExerciseType | None = None,
    lesson_id: uuid.UUID | None = None,
    search: str | None = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    items, total = await list_exercises(
        db,
        user,
        exercise_type=exercise_type,
        lesson_id=lesson_id,
        search=search,
        page=page,
        per_page=per_page,
    )
    # Библиотеку открывают с вопросом «что из этого никуда не поставлено»,
    # поэтому признак считается по блокам уроков — один запрос на страницу.
    placed = await placed_exercise_ids(db, user.org_id)
    return ExerciseListResponse(
        items=[_with_placement(_for_reader(e, user), placed) for e in items],
        total=total,
        page=page,
        per_page=per_page,
    )


@router.get("/submissions/{submission_id}/download")
async def download_file_endpoint(
    submission_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy import select

    from app.common.exceptions import NotFoundError
    from app.exercises.models import ExerciseSubmission

    result = await db.execute(
        select(ExerciseSubmission).where(ExerciseSubmission.id == submission_id)
    )
    submission = result.scalar_one_or_none()
    if not submission:
        raise NotFoundError("Submission not found")

    if user.role == UserRole.student and submission.student_id != user.id:
        raise NotFoundError("Submission not found")

    if not submission.file_path:
        raise NotFoundError("No file attached to this submission")

    return FileResponse(
        path=submission.file_path,
        filename=submission.original_filename,
        media_type=submission.mime_type or "application/octet-stream",
    )


@router.get("/by-lesson/{lesson_id}", response_model=list[ExerciseResponse])
async def get_exercises_by_lesson_endpoint(
    lesson_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    exercises = await get_exercises_by_lesson(db, lesson_id, user)
    return [_for_reader(ex, user) for ex in exercises]


@router.get("/{exercise_id}", response_model=ExerciseResponse)
async def get_exercise_endpoint(
    exercise_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    exercise = await get_exercise(db, exercise_id, user)
    return _for_reader(exercise, user)


@router.put("/{exercise_id}", response_model=ExerciseResponse)
async def update_exercise_endpoint(
    exercise_id: uuid.UUID,
    data: ExerciseUpdate,
    user: User = Depends(require_role(UserRole.admin, UserRole.teacher)),
    db: AsyncSession = Depends(get_db),
):
    exercise = await update_exercise(db, exercise_id, user, data.model_dump(exclude_unset=True))
    return _for_reader(exercise, user)


@router.delete("/{exercise_id}")
async def delete_exercise_endpoint(
    exercise_id: uuid.UUID,
    user: User = Depends(require_role(UserRole.admin, UserRole.teacher)),
    db: AsyncSession = Depends(get_db),
):
    await delete_exercise(db, exercise_id, user)
    return {"status": "ok"}


# ─── Questions (quiz exercises) ─────────────────────────────────────


@router.post("/{exercise_id}/questions", response_model=QuestionInExercise)
async def add_question_endpoint(
    exercise_id: uuid.UUID,
    data: QuestionCreate,
    user: User = Depends(require_role(UserRole.admin, UserRole.teacher)),
    db: AsyncSession = Depends(get_db),
):
    question = await add_question_to_exercise(db, exercise_id, user, data.model_dump())
    return QuestionInExercise.model_validate(question)


@router.put("/{exercise_id}/questions/{question_id}", response_model=QuestionInExercise)
async def update_question_endpoint(
    exercise_id: uuid.UUID,
    question_id: uuid.UUID,
    data: QuestionUpdate,
    user: User = Depends(require_role(UserRole.admin, UserRole.teacher)),
    db: AsyncSession = Depends(get_db),
):
    question = await update_question_in_exercise(
        db, question_id, user, data.model_dump(exclude_unset=True)
    )
    return QuestionInExercise.model_validate(question)


@router.delete("/{exercise_id}/questions/{question_id}")
async def delete_question_endpoint(
    exercise_id: uuid.UUID,
    question_id: uuid.UUID,
    user: User = Depends(require_role(UserRole.admin, UserRole.teacher)),
    db: AsyncSession = Depends(get_db),
):
    await delete_question_from_exercise(db, question_id, user)
    return {"status": "ok"}


# ─── Test cases (code challenge exercises) ──────────────────────────


@router.post("/{exercise_id}/test-cases", response_model=TestCaseInExercise)
async def add_test_case_endpoint(
    exercise_id: uuid.UUID,
    data: TestCaseCreate,
    user: User = Depends(require_role(UserRole.admin, UserRole.teacher)),
    db: AsyncSession = Depends(get_db),
):
    tc = await add_test_case_to_exercise(db, exercise_id, user, data.model_dump())
    return TestCaseInExercise.model_validate(tc)


@router.patch("/{exercise_id}/test-cases/{test_case_id}", response_model=TestCaseInExercise)
async def update_test_case_endpoint(
    exercise_id: uuid.UUID,
    test_case_id: uuid.UUID,
    data: TestCaseUpdate,
    user: User = Depends(require_role(UserRole.admin, UserRole.teacher)),
    db: AsyncSession = Depends(get_db),
):
    tc = await update_test_case_in_exercise(
        db, test_case_id, user, data.model_dump(exclude_unset=True)
    )
    return TestCaseInExercise.model_validate(tc)


@router.delete("/{exercise_id}/test-cases/{test_case_id}")
async def delete_test_case_endpoint(
    exercise_id: uuid.UUID,
    test_case_id: uuid.UUID,
    user: User = Depends(require_role(UserRole.admin, UserRole.teacher)),
    db: AsyncSession = Depends(get_db),
):
    await delete_test_case_from_exercise(db, test_case_id, user)
    return {"status": "ok"}


# ─── Submissions ─────────────────────────────────────────────────────


@router.get("/{exercise_id}/attempts")
async def get_attempts_endpoint(
    exercise_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await get_attempt_status(db, exercise_id, user)


@router.post("/{exercise_id}/check", response_model=CheckExerciseResponse)
@limiter.limit("30/minute")
async def check_exercise_endpoint(
    request: Request,
    response: Response,
    exercise_id: uuid.UUID,
    data: CheckExerciseRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Non-persisting grade check for deferred-feedback UIs (integrity
    model B). Returns per-item booleans only — never the expected answer —
    and does not create a submission or consume an attempt. Rate-limited to
    blunt oracle-style brute force; the signal it exposes is the same one
    the deferred-check UX shows on screen."""
    from app.submissions.service import grade_interactive_detail

    exercise = await get_exercise(db, exercise_id, user)
    if exercise.exercise_type == ExerciseType.quiz:
        # quiz answers live in the `questions` relation, not in config —
        # reuse the same correctness helper the submit path grades with
        from app.assessments.grading import is_answer_correct, quiz_answers_from_payload

        # Same reader as /submit — the two unwrapped the envelope separately
        # until one of them stopped matching what the client sends (specs/047).
        answers = quiz_answers_from_payload(data.model_dump())
        by_q = {str(a.get("question_id")): a for a in answers}
        # read the relation fresh — a cached exercise instance can carry a
        # stale (empty) collection right after questions were added
        from app.assessments.models import Question

        q_rows = await db.execute(
            select(Question)
            .where(Question.exercise_id == exercise.id)
            .order_by(Question.sort_order)
        )
        questions = list(q_rows.scalars().all())
        per_item = {str(q.id): is_answer_correct(q, by_q.get(str(q.id))) for q in questions}
        score = (sum(per_item.values()) / len(questions)) if questions else 1.0
        passing = (exercise.config or {}).get("passing_score", 70) / 100
        return CheckExerciseResponse(
            score=round(score, 4), passed=score >= passing, per_item=per_item
        )
    score, passed, per_item = grade_interactive_detail(
        exercise.config or {}, exercise.exercise_type.value, data.interactive_answers
    )
    return CheckExerciseResponse(score=round(score, 4), passed=passed, per_item=per_item)


@router.post("/robot/preview", response_model=RobotRunResponse)
async def robot_preview_endpoint(
    data: RobotPreviewRequest,
    user: User = Depends(require_role(UserRole.admin, UserRole.teacher)),
):
    """Run a program against a level that has not been saved.

    Staff only, and not because the level is secret — the caller supplies it, so
    a pupil reaching this route could author a one-cell level and win it.

    Every blocker comes back together (FR-020). A teacher fixing one fault per
    save is the failure this replaces.
    """
    from app.exercises import robot_runner, robot_validate

    blockers = robot_validate.check(data.config)
    if blockers:
        raise HTTPException(status_code=400, detail={"blockers": blockers})

    try:
        result = await robot_runner.run(data.config, data.source)
    except RuntimeError:
        raise HTTPException(
            status_code=503,
            detail="The service that runs programs is unavailable. Try again.",
        ) from None

    return RobotRunResponse(**result)


@router.post("/robot/solve", response_model=RobotSolveResponse)
async def robot_solve_endpoint(
    data: RobotSolveRequest,
    user: User = Depends(require_role(UserRole.admin, UserRole.teacher)),
):
    """Can this level be finished, and in how few steps. The Check button.

    Three answers, and it always says which. Where the search declines — a goal
    over the numbers on the floor, or more targets than it can walk — the
    figures come from the teacher's own solution instead, and `answer` stays
    `reference_only` so the editor can never show them as an optimum (FR-035,
    SC-011).
    """
    from app.exercises import robot_runner, robot_solver, robot_validate

    blockers = robot_validate.check(data.config)

    reference_run = None
    solution = (data.config.get("solution_code") or "").strip()
    if solution and not blockers:
        try:
            reference_run = await robot_runner.run(data.config, solution)
        except RuntimeError:
            raise HTTPException(
                status_code=503,
                detail="The service that runs programs is unavailable. Try again.",
            ) from None

    answer = robot_solver.solve(data.config, reference_run)
    answer["blockers"] = [*blockers, *answer["blockers"]]
    return RobotSolveResponse(**answer)


@router.post("/{exercise_id}/robot/run", response_model=RobotRunResponse)
# The deferred form, as the sandbox demo route uses, so the limit can be
# tightened by environment without shipping code.
@limiter.limit(lambda: settings.robot_run_rate_limit)
async def robot_run_endpoint(
    request: Request,
    response: Response,
    exercise_id: uuid.UUID,
    data: RobotRunRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Run a robot program. Persists nothing and consumes no attempt.

    Pressing Run is how a child finds out what their program does, so it has to
    be free — a quota here teaches them to fear the button. Attempts are spent
    by submitting.

    Note what the request cannot say: there is no `completed` and no `score`.
    The server runs the program and reads the verdict off its own replay.
    """
    from app.exercises import robot_runner
    from app.exercises.service import _get_exercise_with_relations

    exercise = await _get_exercise_with_relations(db, exercise_id, user)
    if exercise.exercise_type != ExerciseType.robot_2d:
        # Not "wrong type" — an id that is not a robot level is, for this route,
        # an id that does not exist. Same reasoning as cross-school reads.
        raise HTTPException(status_code=404, detail="Exercise not found")

    try:
        result = await robot_runner.run(exercise.config or {}, data.source)
    except RuntimeError:
        raise HTTPException(
            status_code=503,
            detail="The service that runs programs is unavailable. Try again.",
        ) from None

    return RobotRunResponse(**result)


@router.post("/world/preview", response_model=WorldRunResponse)
async def world_preview_endpoint(
    data: WorldPreviewRequest,
    user: User = Depends(require_role(UserRole.admin, UserRole.teacher)),
):
    """Run a program against a 3D level that has not been saved.

    Staff only, and not because the level is secret — the caller supplies it, so
    a pupil reaching this route could author a one-square level and win it.

    Every blocker comes back together (FR-027). A teacher fixing one fault per
    save is the failure this replaces.
    """
    from app.exercises import robot_runner, world_sim, world_validate

    blockers = world_validate.check(data.config)
    if blockers:
        raise HTTPException(status_code=400, detail={"blockers": blockers})

    try:
        result = await robot_runner.run(data.config, data.source, sim=world_sim)
    except RuntimeError:
        raise HTTPException(
            status_code=503,
            detail="The service that runs programs is unavailable. Try again.",
        ) from None

    return WorldRunResponse(**result)


@router.post("/world/solve", response_model=WorldSolveResponse)
async def world_solve_endpoint(
    data: WorldSolveRequest,
    user: User = Depends(require_role(UserRole.admin, UserRole.teacher)),
):
    """Can this 3D level be finished, and in how few steps. The Check button.

    Three answers, and it always says which. Where the search declines — more
    items and buttons than it can walk — the figures come from the teacher's own
    solution instead, and `answer` stays `reference_only` so the editor can
    never show them as an optimum (FR-026).
    """
    from app.exercises import robot_runner, world_sim, world_solver, world_validate

    blockers = world_validate.check(data.config)

    reference_run = None
    solution = (data.config.get("solution_code") or "").strip()
    if solution and not blockers:
        try:
            reference_run = await robot_runner.run(data.config, solution, sim=world_sim)
        except RuntimeError:
            raise HTTPException(
                status_code=503,
                detail="The service that runs programs is unavailable. Try again.",
            ) from None

    answer = world_solver.solve(data.config, reference_run)
    answer["blockers"] = [*blockers, *answer["blockers"]]
    return WorldSolveResponse(**answer)


@router.post("/{exercise_id}/world/run", response_model=WorldRunResponse)
# Same deferred limit as the 2D route: one allowance for "a child pressing Run",
# whichever world they are in.
@limiter.limit(lambda: settings.robot_run_rate_limit)
async def world_run_endpoint(
    request: Request,
    response: Response,
    exercise_id: uuid.UUID,
    data: WorldRunRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Run a 3D program. Persists nothing and consumes no attempt.

    The 2D twin of this endpoint is directly above, and the two differ by one
    argument: which world to run in. Note what the request cannot say — there is
    no `completed` and no `score`. The server runs the program and reads the
    verdict off its own replay.
    """
    from app.exercises import robot_runner, world_sim
    from app.exercises.service import _get_exercise_with_relations

    exercise = await _get_exercise_with_relations(db, exercise_id, user)
    if exercise.exercise_type != ExerciseType.world_3d:
        # Not "wrong type" — an id that is not a 3D level is, for this route, an
        # id that does not exist. Same reasoning as cross-school reads.
        raise HTTPException(status_code=404, detail="Exercise not found")

    try:
        result = await robot_runner.run(exercise.config or {}, data.source, sim=world_sim)
    except RuntimeError:
        raise HTTPException(
            status_code=503,
            detail="The service that runs programs is unavailable. Try again.",
        ) from None

    return WorldRunResponse(**result)


@router.post("/{exercise_id}/submit", response_model=ExerciseSubmissionResponse)
async def submit_exercise_endpoint(
    exercise_id: uuid.UUID,
    data: SubmitExerciseRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    submission = await submit_exercise(db, exercise_id, user, data.model_dump())

    # live-lesson hook: if the student is in an active lesson, notify its teacher panel
    try:
        from app.live_lessons import realtime as live_realtime

        active = await live_realtime.get_redis().get(live_realtime.active_lesson_key(user.id))
        if active:
            await live_realtime.publish(
                uuid.UUID(active),
                "teacher",
                "submission",
                {
                    "student_id": str(user.id),
                    "exercise_id": str(exercise_id),
                    "passed": submission.passed,
                    "score": submission.score,
                },
            )
    except Exception:  # noqa: BLE001 — a broken hook must never fail a submit
        pass

    # Lesson-completion hook: a lesson made of exercises hides the "complete"
    # button, so solving them has to be what closes it (specs/050).
    if submission.passed:
        try:
            from app.exercises.service import complete_lesson_if_exercises_passed

            await complete_lesson_if_exercises_passed(db, exercise_id, user)
        except Exception:  # noqa: BLE001 — same rule: the work is already saved
            pass

    resp = ExerciseSubmissionResponse.model_validate(submission)

    if hasattr(submission, "_per_item"):
        resp.per_item = submission._per_item  # type: ignore[attr-defined]

    # Attach attempt tracking info
    if hasattr(submission, "_attempt_number"):
        resp.attempt_number = submission._attempt_number  # type: ignore[attr-defined]
        resp.attempts_remaining = submission._attempts_remaining  # type: ignore[attr-defined]
        resp.max_attempts_reached = submission._max_attempts_reached  # type: ignore[attr-defined]
        resp.correct_answer = submission._correct_answer  # type: ignore[attr-defined]
    else:
        # Normal submission — attempt_number is stamped on the row at insert
        # time; only remaining/limit info is computed here.
        from app.exercises.service import _count_attempts, _get_exercise_with_relations

        exercise = await _get_exercise_with_relations(db, exercise_id, user)
        max_att = exercise.max_attempts if exercise.max_attempts is not None else 100
        count = await _count_attempts(db, exercise_id, user.id)
        if resp.attempt_number is None:
            resp.attempt_number = count
        resp.attempts_remaining = max(0, max_att - count)
        resp.max_attempts_reached = count >= max_att

    return resp


@router.post("/{exercise_id}/upload", response_model=ExerciseSubmissionResponse)
async def upload_file_endpoint(
    exercise_id: uuid.UUID,
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    submission = await upload_file_submission(db, exercise_id, user, file)

    # live-lesson hook: mirror of the submit endpoint (see submit_exercise_endpoint)
    try:
        from app.live_lessons import realtime as live_realtime

        active = await live_realtime.get_redis().get(live_realtime.active_lesson_key(user.id))
        if active:
            await live_realtime.publish(
                uuid.UUID(active),
                "teacher",
                "submission",
                {
                    "student_id": str(user.id),
                    "exercise_id": str(exercise_id),
                    "passed": submission.passed,
                    "score": submission.score,
                },
            )
    except Exception:  # noqa: BLE001 — a broken hook must never fail an upload
        pass

    return ExerciseSubmissionResponse.model_validate(submission)


@router.get("/{exercise_id}/submissions", response_model=SubmissionListResponse)
async def list_submissions_endpoint(
    exercise_id: uuid.UUID,
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    items, total = await list_submissions(db, exercise_id, user, page, per_page)
    return SubmissionListResponse(
        items=[ExerciseSubmissionResponse.model_validate(s) for s in items],
        total=total,
        page=page,
        per_page=per_page,
    )


# ─── Live-lesson drafts ──────────────────────────────────────────────


@router.post("/{exercise_id}/draft", status_code=204)
async def save_draft_endpoint(
    exercise_id: uuid.UUID,
    data: DraftRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Autosave a student's in-progress answer.

    Server-side gate: drafts are only stored while the student is in an
    active live lesson — keeps this write-path lesson-bounded on prod.
    """
    from app.live_lessons import realtime as live_realtime
    from app.live_lessons.models import ExerciseDraft

    active = await live_realtime.get_redis().get(live_realtime.active_lesson_key(user.id))
    if active is None:
        return Response(status_code=204)  # silent no-op
    draft = await db.scalar(
        select(ExerciseDraft).where(
            ExerciseDraft.exercise_id == exercise_id,
            ExerciseDraft.student_id == user.id,
        )
    )
    if draft is None:
        draft = ExerciseDraft(org_id=user.org_id, exercise_id=exercise_id, student_id=user.id)
        db.add(draft)
    draft.answers = data.answers
    draft.source_code = data.source_code
    await db.flush()
    return Response(status_code=204)


@router.get("/{exercise_id}/drafts/{student_id}")
async def get_draft_endpoint(
    exercise_id: uuid.UUID,
    student_id: uuid.UUID,
    request: Request,
    user: User = Depends(require_role(UserRole.admin, UserRole.teacher)),
    db: AsyncSession = Depends(get_db),
):
    from app.live_lessons.models import ExerciseDraft

    draft = await db.scalar(
        select(ExerciseDraft).where(
            ExerciseDraft.exercise_id == exercise_id,
            ExerciseDraft.student_id == student_id,
            ExerciseDraft.org_id == user.org_id,
        )
    )
    if draft is None:
        raise HTTPException(status_code=404, detail="no draft")
    etag = f'"{draft.updated_at.isoformat()}"'
    if request.headers.get("if-none-match") == etag:
        return Response(status_code=304)
    return JSONResponse(
        content={
            "exercise_id": str(draft.exercise_id),
            "student_id": str(draft.student_id),
            "answers": draft.answers,
            "source_code": draft.source_code,
            "updated_at": draft.updated_at.isoformat(),
        },
        headers={"ETag": etag},
    )


# ─── Helpers ─────────────────────────────────────────────────────────


def _with_placement(response: ExerciseResponse, placed: set) -> ExerciseResponse:
    """Проставить признак «стоит в уроке» уже отфильтрованному ответу.

    Отдельной функцией, потому что порядок важен: сначала `_for_reader`
    срезает ответы тем, кому их видеть нельзя, и только потом дописывается
    то, что видно всем.
    """
    response.is_placed = response.id in placed
    return response


def _for_reader(exercise, user: User) -> ExerciseResponse:
    """The only way an Exercise becomes an ExerciseResponse.

    Each read endpoint used to build the response itself and decide for itself
    whether to strip. `GET /exercises` — which takes the same `lesson_id`
    filter as `by-lesson` — never did, so the guarded route had an unguarded
    twin that handed students `solution_code` and every hidden test case.
    Routing all of them through here leaves nothing to remember: writing an
    endpoint that leaks now means calling `model_validate` directly, which is
    one grep away from being spotted.
    """
    resp = ExerciseResponse.model_validate(exercise)
    return resp if _may_see_answers(user) else _strip_answers(resp)


def _may_see_answers(user: User) -> bool:
    """Only staff read an exercise with its answer key attached.

    The check used to be ``role == student``, which left parents — the one
    other non-staff role, and one deliberately linked to a child — reading the
    correct answers of the very exercises that child is set. Mirrors
    ``exercises.service._check_permission``: student and parent are the roles
    that may not manage exercises, so they are the roles that may not see
    inside them either.
    """
    return user.role not in (UserRole.student, UserRole.parent)


def _strip_answers(resp: ExerciseResponse) -> ExerciseResponse:
    """Remove correct answers from a response bound for a non-staff reader."""
    if resp.questions:
        for q in resp.questions:
            if isinstance(q.options, list):
                # Adaptive choice (specs/019): tell the student HOW to answer
                # (checkboxes vs radio) without telling them WHAT is correct.
                q.multi = sum(1 for opt in q.options if opt.get("is_correct")) > 1
                for opt in q.options:
                    opt.pop("is_correct", None)
            elif isinstance(q.options, dict):
                # text-question checking rules carry `accepted` variants —
                # answers. Students get none of it.
                q.options = None
            q.correct_answer = None
    if resp.test_cases:
        resp.test_cases = [tc for tc in resp.test_cases if not tc.is_hidden]
    # Strip solution from config but keep shuffled blanks / sentence words
    # as a `word_bank` so the renderer has something to display.
    if resp.config:
        import random

        blanks = resp.config.get("blanks")
        correct_order = resp.config.get("correct_order")
        distractors = resp.config.get("distractors") or []
        resp.config = {
            k: v
            for k, v in resp.config.items()
            # `words` (sentence_builder) duplicates correct_order verbatim;
            # `distractors` alone lets word_bank − distractors recover the
            # correct word set. Both fold into the shuffled word_bank below.
            if k
            not in (
                "solution_code",
                "correct_order",
                "blanks",
                "correct_answer",
                "accepted_answers",  # translation
                "distractors",
            )
            # `words` is the sentence_builder duplicate of correct_order —
            # drop it only there. Crossword uses `words` for its grid entries
            # and has its own strip below.
            and not (k == "words" and correct_order is not None)
        }
        if blanks:
            shuffled = list(blanks)
            random.shuffle(shuffled)
            resp.config["word_bank"] = shuffled
        elif correct_order is not None:
            # sentence_builder — the renderer used to reach for `correct_order`
            # directly, which we just stripped. Provide a shuffled pool
            # (correct words + distractors) under `word_bank` instead.
            pool = list(correct_order) + list(distractors)
            random.shuffle(pool)
            resp.config["word_bank"] = pool
        # Per-type answer keys inside nested structures (integrity model B):
        # keep display data, drop the key — the server is the sole grader.
        if isinstance(resp.config.get("table"), list):  # conjugation
            resp.config["table"] = [
                {k: v for k, v in row.items() if k != "correct"} if isinstance(row, dict) else row
                for row in resp.config["table"]
            ]
        # dialogue: the option flagged is_correct is the answer key
        if isinstance(resp.config.get("messages"), list):
            resp.config["messages"] = [
                {
                    **m,
                    "options": [
                        {k: v for k, v in o.items() if k != "is_correct"}
                        if isinstance(o, dict)
                        else o
                        for o in m["options"]
                    ],
                }
                if isinstance(m, dict) and isinstance(m.get("options"), list)
                else m
                for m in resp.config["messages"]
            ]
        # crossword: keep the geometry and the clue, replace the solution
        # word with its length so the grid can still be drawn. Guarded on
        # `grid_size` so the sentence_builder `words` key never matches.
        if isinstance(resp.config.get("words"), list) and resp.config.get("grid_size"):
            resp.config["words"] = [
                {
                    **{k: v for k, v in w.items() if k != "word"},
                    "length": len(str(w.get("word") or "")),
                }
                if isinstance(w, dict)
                else w
                for w in resp.config["words"]
            ]
        if isinstance(resp.config.get("questions"), list):  # bubble_sheet / reading
            resp.config["questions"] = [
                {
                    # bubble_sheet keys off `correct`; reading off
                    # `correct_answer` plus per-option `is_correct`;
                    # `accepted` is the text-rules variant list — answers too
                    **{
                        k: v
                        for k, v in q.items()
                        if k not in ("correct", "correct_answer", "accepted")
                    },
                    **(
                        {
                            "options": [
                                {k: v for k, v in o.items() if k != "is_correct"}
                                if isinstance(o, dict)
                                else o
                                for o in q["options"]
                            ],
                            # adaptive choice: checkboxes when several correct
                            "multi": sum(
                                1
                                for o in q["options"]
                                if isinstance(o, dict) and o.get("is_correct")
                            )
                            > 1,
                        }
                        if isinstance(q.get("options"), list)
                        else {}
                    ),
                }
                if isinstance(q, dict)
                else q
                for q in resp.config["questions"]
            ]
        # matching: the left→right mapping IS the answer. Ship the two
        # columns separately, right side shuffled, and drop `pairs`.
        if isinstance(resp.config.get("pairs"), list):
            pairs = [p for p in resp.config["pairs"] if isinstance(p, dict)]
            rights = [p.get("right") for p in pairs]
            random.shuffle(rights)
            resp.config = {k: v for k, v in resp.config.items() if k != "pairs"}
            resp.config["left_items"] = [p.get("left") for p in pairs]
            resp.config["right_items"] = rights
        # categorize: same idea — category names plus a shuffled flat item
        # pool, never the per-category membership.
        if isinstance(resp.config.get("categories"), list):
            cats = [c for c in resp.config["categories"] if isinstance(c, dict)]
            items = [i for c in cats for i in (c.get("items") or [])]
            random.shuffle(items)
            resp.config = {k: v for k, v in resp.config.items() if k != "categories"}
            resp.config["category_names"] = [c.get("name") for c in cats]
            resp.config["items"] = items
        if isinstance(resp.config.get("pins"), list):  # map_pin_drop
            resp.config["pins"] = [
                {k: v for k, v in p.items() if k not in ("x", "y", "tolerance")}
                if isinstance(p, dict)
                else p
                for p in resp.config["pins"]
            ]
    return resp
