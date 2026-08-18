import uuid
from datetime import datetime

from pydantic import BaseModel, Field

from app.exercises.models import ExerciseType

# ─── Config schemas per exercise type ───────────────────────────────


class QuizConfig(BaseModel):
    passing_score: int = 70
    time_limit_minutes: int | None = None


class CodeChallengeConfig(BaseModel):
    language: str = "python"
    starter_code: str = ""
    solution_code: str = ""
    time_limit_seconds: int = 10
    memory_limit_mb: int = 256


class MatchingConfig(BaseModel):
    pairs: list[dict] = []  # [{left, right}]
    shuffle: bool = True


class OrderingConfig(BaseModel):
    items: list[str] = []
    correct_order: list[str] = []


class FillBlanksConfig(BaseModel):
    text: str = ""
    blanks: list[str] = []


class TrueFalseConfig(BaseModel):
    statement: str = ""
    correct_answer: bool = True


class CategorizeConfig(BaseModel):
    categories: list[dict] = []  # [{name, items: []}]


class FileUploadConfig(BaseModel):
    allowed_types: list[str] = [".pdf", ".png", ".jpg", ".jpeg", ".doc", ".docx"]
    max_file_mb: int = 50


class Robot2DConfig(BaseModel):
    """A level. See `specs/005-robot-2d-rework/data-model.md`.

    Four fields are gone rather than deprecated:

    - `available_blocks` — the editor wrote it and nothing ever read it, so the
      teacher's choice of commands was discarded. `commands` replaces it and is
      the single record of what a level offers.
    - `custom_win_js` — arbitrary JavaScript stored on the level and shipped to
      the pupil's browser: an answer key and an execution surface at once. `win`
      replaces it with an expression over a fixed vocabulary.
    - `win_condition` folds into `win`; `difficulty` becomes `preset`, a label.
      Two records of one thing is how the two drift apart.
    """

    grid_width: int = 5
    grid_height: int = 5
    start: dict = {"x": 0, "y": 0, "facing": "right"}
    #: Sparse: [{x, y, type: "empty"|"wall"|"item"|"goal", mark?: bool,
    #: value?: int}]. A position absent here is bare floor.
    cells: list[dict] = []
    #: What this level offers. Drives the block palette, the Python
    #: autocompletion and the starter header — all three from this one list.
    commands: list[str] = ["move_forward", "turn_left", "turn_right", "at_goal"]
    #: Expression over the vocabulary in data-model.md, joined by and/or/not.
    win: dict = {"cond": "at_goal"}
    max_steps: int = 500
    #: Star thresholds, filled by the editor's Check button and left editable.
    star_steps: int | None = None
    star_size: int | None = None
    #: The teacher's reference solution. Already stripped for non-staff readers
    #: by `router.py::_strip_answers`, which keys on this exact name.
    solution_code: str | None = None
    hints: list[str] = []
    #: A label only. `commands` is what the level actually offers.
    preset: str = "beginner"


class MathInteractiveConfig(BaseModel):
    template_type: str = "coordinate_plane"
    template_config: dict = {}
    custom_html: str | None = None
    # `success_condition` lived here and was read by nobody: not the templates,
    # which decide from their own `template_config`, and not the server, which
    # does not mark this type at all. A seeded exercise carried
    # {"kind": "click_origin"} next to an instruction telling the pupil to drag
    # two points, and neither the audit nor the code could say which was the
    # task, because the field never was one.
    difficulty: str = "beginner"
    instructions: str = ""


class World3DConfig(BaseModel):
    grid_width: int = 6
    grid_depth: int = 6
    cells: list[dict] = []  # [{x, z, y, type, id?, color?, properties?}]
    player_start: dict = {"x": 0, "y": 0, "z": 0, "direction": "east"}
    available_blocks: list[str] = ["move_forward", "turn_left", "turn_right", "jump"]
    win_condition: str = "reach_goal"
    custom_win_js: str | None = None
    difficulty: str = "beginner"
    hints: list[str] = []
    allow_python: bool = False


class TranslationConfig(BaseModel):
    source_text: str = ""
    source_language: str = "en"
    target_language: str = ""
    accepted_answers: list[str] = []
    case_sensitive: bool = False
    hints: list[str] = []


class SentenceBuilderConfig(BaseModel):
    words: list[str] = []
    correct_order: list[str] = []
    distractors: list[str] = []
    instructions: str = ""


class DialogueConfig(BaseModel):
    context: str = ""
    messages: list[dict] = []  # [{speaker, text, options?}]


class ConjugationConfig(BaseModel):
    verb: str = ""
    tense: str = ""
    language: str = ""
    table: list[dict] = []  # [{pronoun, correct}]


class ReadingConfig(BaseModel):
    passage: str = ""
    questions: list[dict] = []  # [{question, type, options?, correct_answer?}]


class WebEditorConfig(BaseModel):
    description: str = ""
    starter_html: str = ""
    starter_css: str = ""
    starter_js: str = ""
    requirements: list[str] = []


# ─── Exercise CRUD schemas ──────────────────────────────────────────


class ExerciseCreate(BaseModel):
    lesson_id: uuid.UUID
    exercise_type: ExerciseType
    title: str
    config: dict = {}
    sort_order: int = 0
    max_attempts: int | None = 100


class ExerciseUpdate(BaseModel):
    title: str | None = None
    config: dict | None = None
    sort_order: int | None = None
    max_attempts: int | None = None


class QuestionInExercise(BaseModel):
    id: uuid.UUID
    question_text: str
    question_type: str
    options: list[dict] | None = None
    correct_answer: str | None = None
    points: int = 1
    sort_order: int = 0

    model_config = {"from_attributes": True}


class TestCaseInExercise(BaseModel):
    id: uuid.UUID
    input: str = ""
    expected_output: str
    is_hidden: bool = False
    sort_order: int = 0

    model_config = {"from_attributes": True}


class ExerciseResponse(BaseModel):
    id: uuid.UUID
    lesson_id: uuid.UUID
    org_id: uuid.UUID
    display_id: str
    exercise_type: ExerciseType
    title: str
    config: dict
    sort_order: int
    max_attempts: int | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None
    questions: list[QuestionInExercise] | None = None
    test_cases: list[TestCaseInExercise] | None = None

    model_config = {"from_attributes": True}


class ExerciseListResponse(BaseModel):
    items: list[ExerciseResponse]
    total: int
    page: int
    per_page: int


# ─── Submission schemas ─────────────────────────────────────────────


class GameResultPayload(BaseModel):
    """What a game level reports when the browser has finished playing a run.

    Typed rather than a bare dict because `_submit_game_level` hands `score`
    straight to `float()`. A word there raised ValueError and the pupil read
    `Internal server error`; now the request is refused with 422 naming the
    field. Unknown keys are still accepted, so a client that sends more than
    this keeps working.
    """

    completed: bool = False
    score: float = 0.0
    steps_used: int | None = None
    time_seconds: float | None = None
    code_snapshot: str | None = None
    replay_log: list | dict | None = None


class WebCodePayload(BaseModel):
    """The three files a web-editor submission carries.

    Typed for the same reason: `html` is stored in a VARCHAR column, so a list
    reached the driver and failed there, long after the request was accepted.
    """

    html: str = ""
    css: str = ""
    js: str = ""


class SubmitExerciseRequest(BaseModel):
    """Universal submit request. Depending on exercise type, different fields are used."""

    # Quiz
    answers: list[dict] | None = None  # [{question_id, selected_option or text}]
    # Code
    source_code: str | None = None
    language: str | None = None
    # Interactive (matching, ordering, fill_blanks, true_false, categorize)
    interactive_answers: dict | None = None
    # Game levels (math_interactive, world_3d). `robot_2d` no longer reads this:
    # it carried the client's own verdict, which the server then recorded
    # verbatim. A request that still sends it is accepted and the field ignored,
    # so an old client cannot forge a pass — it simply gets graded on its code.
    game_result: GameResultPayload | None = None
    # robot_2d. The program, and nothing about how it went — the server runs it
    # and reaches its own verdict. {source, mode: "python"|"blocks"}
    robot: dict | None = None
    # Web editor (HTML/CSS/JS)
    web_code: WebCodePayload | None = None
    # Time-on-task (Phase 1 analytics). Optional — older clients omit it and
    # the submission still succeeds with the timing fields left NULL. Clamped
    # server-side to [0, 86400] (24h) to drop garbage / tab-switch inflation.
    elapsed_seconds: int | None = None


class ExerciseSubmissionResponse(BaseModel):
    id: uuid.UUID
    exercise_id: uuid.UUID
    student_id: uuid.UUID
    answers: dict | None = None
    score: float | None = None
    passed: bool | None = None
    status: str
    source_code: str | None = None
    language: str | None = None
    execution_time_ms: int | None = None
    total_passed: int | None = None
    total_tests: int | None = None
    results: dict | None = None
    original_filename: str | None = None
    file_size: int | None = None
    mime_type: str | None = None
    submitted_at: datetime
    graded_at: datetime | None = None
    created_at: datetime | None = None
    # Time-on-task analytics (Phase 1). started_at / time_spent_seconds come
    # straight off the stored row; NULL for older submissions or clients that
    # don't send elapsed_seconds.
    started_at: datetime | None = None
    time_spent_seconds: int | None = None
    # Attempt tracking. attempt_number is now stored on the row at insert time
    # (= prior attempt count + 1); the router still overrides it for the
    # max-attempts-exhausted synthetic submission.
    attempt_number: int | None = None
    attempts_remaining: int | None = None
    max_attempts_reached: bool = False
    correct_answer: dict | None = None
    # Per-item verdicts for interactive types (integrity model B): booleans
    # only, keyed per slot ({pronoun: bool}, {"0": bool}) or positional list.
    per_item: dict[str, bool] | list[bool] | None = None

    model_config = {"from_attributes": True}


# ─── Robot 2D ────────────────────────────────────────────────────────
#
# Contract: `specs/005-robot-2d-rework/contracts/api.md`.
#
# Note what the request does not carry: no `completed`, no `score`, no step
# count. The client has nothing to assert, because the server runs the program
# itself and reads the verdict off its own replay.


class RobotRunRequest(BaseModel):
    source: str = Field(min_length=1, max_length=20_000)
    mode: str = "python"  # python | blocks — recorded, does not change the run


class RobotRunError(BaseModel):
    """Where a program broke, counted from the pupil's own first line.

    Named apart from `robot_sim.RobotError`, which is an exception the simulator
    raises. The router imports both.
    """

    type: str
    line: int | None = None
    message: str = ""


class RobotRunResponse(BaseModel):
    #: One per attempted command; `cells` lists only what that command changed.
    frames: list[dict] = []
    won: bool = False
    steps: int = 0
    #: Statements in the program the system ran, counted with `ast`. One rule
    #: for both editors, because block mode submits the Python its blocks wrote.
    size: int = 0
    stars: int = 0
    stopped: str = "end_of_program"  # end_of_program | steps_exhausted | error
    output: str = ""
    output_truncated: bool = False
    error: RobotRunError | None = None


class RobotPreviewRequest(BaseModel):
    """Run against a level that has not been saved — the editor's playtest."""

    config: dict
    source: str = Field(default="", max_length=20_000)


class RobotSolveRequest(BaseModel):
    config: dict


class RobotBlocker(BaseModel):
    """A reason a level is not ready. `code` is a key, never a sentence — the
    editor renders it in the teacher's language."""

    code: str
    commands: list[str] = []


class RobotSolveResponse(BaseModel):
    #: shortest — searched exhaustively.
    #: reference_only — not searched; these figures come from the teacher's own
    #:   solution, and the editor must never present them as an optimum.
    #: unsolvable — searched, and there is no path.
    answer: str
    steps: int | None = None
    size: int | None = None
    #: too_many_targets | win_uses_values | no_reference_solution
    reason: str | None = None
    blockers: list[RobotBlocker] = []


class CheckExerciseRequest(BaseModel):
    """Non-persisting grade check (deferred-feedback UX). Same inner payload
    as SubmitExerciseRequest.interactive_answers."""

    interactive_answers: dict


class CheckExerciseResponse(BaseModel):
    score: float
    passed: bool
    per_item: dict[str, bool] | list[bool] | None = None


class SubmissionListResponse(BaseModel):
    items: list[ExerciseSubmissionResponse]
    total: int
    page: int
    per_page: int


# ─── Question / TestCase management ─────────────────────────────────


class QuestionCreate(BaseModel):
    question_text: str
    question_type: str = "multiple_choice"
    options: list[dict] | None = None
    correct_answer: str | None = None
    points: int = 1


class QuestionUpdate(BaseModel):
    question_text: str | None = None
    question_type: str | None = None
    options: list[dict] | None = None
    correct_answer: str | None = None
    points: int | None = None
    sort_order: int | None = None


class TestCaseCreate(BaseModel):
    input: str = ""
    expected_output: str
    is_hidden: bool = False


class TestCaseUpdate(BaseModel):
    input: str | None = None
    expected_output: str | None = None
    is_hidden: bool | None = None
    sort_order: int | None = None
