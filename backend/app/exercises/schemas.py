import uuid
from datetime import datetime

from pydantic import BaseModel

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
    grid_width: int = 5
    grid_height: int = 5
    cells: list[dict] = []  # [{x, y, type: "wall"|"item"|"start"|"goal"|"empty"}]
    available_blocks: list[str] = ["move_forward", "turn_left", "turn_right"]
    win_condition: str = "reach_goal"  # reach_goal | collect_all | custom
    custom_win_js: str | None = None
    max_blocks: int | None = None
    difficulty: str = "beginner"  # beginner | intermediate | advanced
    hints: list[str] = []
    allow_python: bool = False


class MathInteractiveConfig(BaseModel):
    template_type: str = "coordinate_plane"
    template_config: dict = {}
    custom_html: str | None = None
    success_condition: dict = {}
    difficulty: str = "beginner"
    instructions: str = ""


class World3DConfig(BaseModel):
    scene_objects: list[dict] = []  # [{type, position, rotation, scale, properties}]
    player_start: dict = {"x": 0, "y": 0, "z": 0, "direction": 0}
    available_blocks: list[str] = ["move_forward", "turn_left", "turn_right"]
    win_condition: str = "reach_goal"
    custom_win_js: str | None = None
    difficulty: str = "beginner"
    hints: list[str] = []
    allow_python: bool = False


# ─── Exercise CRUD schemas ──────────────────────────────────────────

class ExerciseCreate(BaseModel):
    lesson_id: uuid.UUID
    exercise_type: ExerciseType
    title: str
    config: dict = {}
    sort_order: int = 0


class ExerciseUpdate(BaseModel):
    title: str | None = None
    config: dict | None = None
    sort_order: int | None = None


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

class SubmitExerciseRequest(BaseModel):
    """Universal submit request. Depending on exercise type, different fields are used."""
    # Quiz
    answers: list[dict] | None = None  # [{question_id, selected_option or text}]
    # Code
    source_code: str | None = None
    language: str | None = None
    # Interactive (matching, ordering, fill_blanks, true_false, categorize)
    interactive_answers: dict | None = None
    # Game levels (robot_2d, math_interactive, world_3d)
    game_result: dict | None = None  # {completed, score, steps_used, time_seconds, code_snapshot, replay_log}


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

    model_config = {"from_attributes": True}


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
