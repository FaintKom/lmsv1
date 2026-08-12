import datetime
import uuid

from pydantic import BaseModel, Field


class ExecuteRequest(BaseModel):
    language: str
    source_code: str
    stdin: str = ""


class DemoExecuteRequest(BaseModel):
    """Unauthenticated landing-page demo. Deliberately narrower than
    ExecuteRequest: no stdin (one fewer input to abuse) and a hard source cap,
    so a megabyte of generated code never reaches the sandbox. The language is
    checked by the endpoint against its own short allowlist.
    """

    language: str = Field(max_length=16)
    source_code: str = Field(min_length=1, max_length=2000)


class DemoCheckRequest(BaseModel):
    """Grade a landing-page demo solution. Same caps as DemoExecuteRequest."""

    task_id: str = Field(max_length=64)
    language: str = Field(max_length=16)
    source_code: str = Field(min_length=1, max_length=2000)


class DemoTestResult(BaseModel):
    name: str
    passed: bool
    expected: str
    got: str


class DemoCheckResponse(BaseModel):
    all_passed: bool
    tests: list[DemoTestResult]
    #: Set when the run never produced results — timeout, syntax error, crash.
    error: str | None = None


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
    results: list[dict] | None = None
    total_passed: int
    total_tests: int
    execution_time_ms: int | None = None
    submitted_at: datetime.datetime

    model_config = {"from_attributes": True}
