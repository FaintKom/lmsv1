import uuid

from pydantic import BaseModel


class ExecuteRequest(BaseModel):
    language: str
    source_code: str
    stdin: str = ""


class ExecuteResponse(BaseModel):
    stdout: str
    stderr: str
    exit_code: int
    execution_time_ms: int
    status: str


class ChallengeCreate(BaseModel):
    lesson_id: uuid.UUID
    title: str
    description: str = ""
    language: str
    starter_code: str | None = None
    solution_code: str | None = None
    time_limit_seconds: int = 10
    memory_limit_mb: int = 256


class TestCaseCreate(BaseModel):
    input: str = ""
    expected_output: str
    is_hidden: bool = False


class SubmitCodeRequest(BaseModel):
    source_code: str
    language: str


class ChallengeResponse(BaseModel):
    id: uuid.UUID
    lesson_id: uuid.UUID
    title: str
    description: str
    language: str
    starter_code: str | None
    time_limit_seconds: int
    memory_limit_mb: int
    test_cases: list["TestCaseResponse"] | None = None

    model_config = {"from_attributes": True}


class TestCaseResponse(BaseModel):
    id: uuid.UUID
    input: str
    expected_output: str
    is_hidden: bool
    sort_order: int

    model_config = {"from_attributes": True}


class CodeSubmissionResponse(BaseModel):
    id: uuid.UUID
    source_code: str
    language: str
    status: str
    results: list[dict] | None
    total_passed: int
    total_tests: int
    execution_time_ms: int | None
    submitted_at: str

    model_config = {"from_attributes": True}
