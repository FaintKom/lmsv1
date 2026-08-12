"""The public landing-page code demo, and the fence around it.

This endpoint is unauthenticated by design — the landing has to prove we
really execute code — which makes it the one route where a stranger spends
our CPU. Every limit below is load-bearing, so each is asserted here rather
than left as a comment in the router.
"""

from unittest.mock import AsyncMock, patch

DEMO = "/api/v1/sandbox/demo"

_FAKE_RESULT = {
    "stdout": "3\n",
    "stderr": "",
    "exit_code": 0,
    "execution_time_ms": 12,
    "status": "success",
}


async def test_demo_runs_without_an_account(client):
    """The whole point: no login, and it goes through the real execution path."""
    with patch(
        "app.sandbox.router.execute_code_remote", new=AsyncMock(return_value=_FAKE_RESULT)
    ) as ex:
        r = await client.post(DEMO, json={"language": "python", "source_code": "print(1+2)"})
    assert r.status_code == 200, r.text
    assert r.json()["stdout"] == "3\n"
    assert ex.await_count == 1


async def test_demo_uses_tighter_limits_than_a_real_submission(client):
    """5s / 128MB, not the authenticated route's 10s / 256MB, and no stdin."""
    with patch(
        "app.sandbox.router.execute_code_remote", new=AsyncMock(return_value=_FAKE_RESULT)
    ) as ex:
        await client.post(DEMO, json={"language": "python", "source_code": "print(1)"})
    kwargs = ex.await_args.kwargs
    assert kwargs["timeout_seconds"] == 5
    assert kwargs["memory_limit_mb"] == 128
    assert kwargs["stdin"] == ""


async def test_demo_rejects_languages_outside_its_own_allowlist(client):
    """The authenticated route allows java/cpp/go; the demo deliberately does
    not, so a heavier runtime is never reachable without an account."""
    with patch(
        "app.sandbox.router.execute_code_remote", new=AsyncMock(return_value=_FAKE_RESULT)
    ) as ex:
        r = await client.post(DEMO, json={"language": "cpp", "source_code": "int main(){}"})
    assert r.status_code == 400
    assert ex.await_count == 0, "a rejected language still reached the sandbox"


async def test_demo_caps_source_length(client):
    """A megabyte of generated code must not reach the sandbox at all."""
    with patch(
        "app.sandbox.router.execute_code_remote", new=AsyncMock(return_value=_FAKE_RESULT)
    ) as ex:
        r = await client.post(DEMO, json={"language": "python", "source_code": "x=1\n" * 5000})
    assert r.status_code == 422
    assert ex.await_count == 0, "oversized source still reached the sandbox"


async def test_check_grades_a_correct_solution(client):
    """The happy path, graded by the server against cases it never sent out."""
    from app.sandbox import demo_tasks

    def fake_run(language, program, **kwargs):
        # The harness ends with a nonce-prefixed JSON line; mimic a run where
        # every case returned the expected value.
        nonce = program.rsplit("'", 2)[-2] if "'" in program else ""
        return {
            "stdout": nonce + "[5, 0, 0]\n",
            "stderr": "",
            "exit_code": 0,
            "execution_time_ms": 20,
            "status": "success",
        }

    with patch("app.sandbox.router.execute_code_remote", new=AsyncMock(side_effect=fake_run)):
        r = await client.post(
            "/api/v1/sandbox/demo/check",
            json={
                "task_id": "count_vowels",
                "language": "python",
                "source_code": "def count_vowels(t): return sum(c in 'aeiou' for c in t)",
            },
        )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["all_passed"] is True
    assert len(body["tests"]) == len(demo_tasks.COUNT_VOWELS.tests)


async def test_check_reports_which_cases_failed(client):
    """A wrong answer must name the failing cases, not just say 'wrong'."""

    def fake_run(language, program, **kwargs):
        nonce = program.rsplit("'", 2)[-2] if "'" in program else ""
        return {
            "stdout": nonce + "[5, 3, 0]\n",  # second case wrong
            "stderr": "",
            "exit_code": 0,
            "execution_time_ms": 20,
            "status": "success",
        }

    with patch("app.sandbox.router.execute_code_remote", new=AsyncMock(side_effect=fake_run)):
        r = await client.post(
            "/api/v1/sandbox/demo/check",
            json={"task_id": "count_vowels", "language": "python", "source_code": "x=1"},
        )
    body = r.json()
    assert body["all_passed"] is False
    assert [t["passed"] for t in body["tests"]] == [True, False, True]
    assert body["tests"][1]["got"] == "3"


async def test_check_cannot_be_faked_by_printing_a_pass(client):
    """A submission that prints its own 'all passed' must not be believed.

    The results line is nonce-prefixed per request, so output the solution
    invents is ignored — this is what keeps the demo from lying on behalf of
    whoever is trying it.
    """

    def fake_run(language, program, **kwargs):
        return {
            "stdout": "__deadbeef__[5, 0, 0]\n",  # plausible, wrong nonce
            "stderr": "",
            "exit_code": 0,
            "execution_time_ms": 20,
            "status": "success",
        }

    with patch("app.sandbox.router.execute_code_remote", new=AsyncMock(side_effect=fake_run)):
        r = await client.post(
            "/api/v1/sandbox/demo/check",
            json={"task_id": "count_vowels", "language": "python", "source_code": "print('x')"},
        )
    body = r.json()
    assert body["all_passed"] is False
    assert body["tests"] == []
    assert body["error"]


async def test_check_surfaces_a_syntax_error_as_itself(client):
    """On a landing page a syntax error has to read as a syntax error."""

    def fake_run(language, program, **kwargs):
        return {
            "stdout": "",
            "stderr": "SyntaxError: invalid syntax",
            "exit_code": 1,
            "execution_time_ms": 5,
            "status": "error",
        }

    with patch("app.sandbox.router.execute_code_remote", new=AsyncMock(side_effect=fake_run)):
        r = await client.post(
            "/api/v1/sandbox/demo/check",
            json={"task_id": "count_vowels", "language": "python", "source_code": "def ("},
        )
    body = r.json()
    assert body["all_passed"] is False
    assert "SyntaxError" in body["error"]


async def test_check_rejects_an_unknown_task(client):
    with patch(
        "app.sandbox.router.execute_code_remote", new=AsyncMock(return_value=_FAKE_RESULT)
    ) as ex:
        r = await client.post(
            "/api/v1/sandbox/demo/check",
            json={"task_id": "../etc/passwd", "language": "python", "source_code": "x=1"},
        )
    assert r.status_code == 400
    assert ex.await_count == 0


async def test_demo_tasks_never_ship_the_answers(client):
    """The catalogue endpoint hands out the question, never the expected
    values — otherwise the browser could grade itself and the server would
    stop being the judge."""
    r = await client.get("/api/v1/sandbox/demo/tasks")
    assert r.status_code == 200
    body = r.text
    assert "starters" in body
    for leak in ("expected", '"5"', 'tests":[{"name":"count_vowels(\'education\')","expected'):
        assert leak not in body, f"catalogue leaked {leak!r}"


async def test_demo_ignores_stdin_if_someone_sends_it(client):
    """stdin is not part of the demo schema; an extra field must not slip
    through into the executor."""
    with patch(
        "app.sandbox.router.execute_code_remote", new=AsyncMock(return_value=_FAKE_RESULT)
    ) as ex:
        r = await client.post(
            DEMO,
            json={"language": "python", "source_code": "print(1)", "stdin": "payload"},
        )
    assert r.status_code == 200, r.text
    assert ex.await_args.kwargs["stdin"] == ""
