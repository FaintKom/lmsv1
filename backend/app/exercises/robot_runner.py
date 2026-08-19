"""Run a pupil's program, and work out what actually happened.

The shape of this, and why it is not the obvious one:

    program ──► sandbox ──► ["move_up", "move_up", ["write", 3], …]
                            + printed output
                            + error {type, line, message}
                                  │
                                  ▼
                       replay through robot_sim, here,
                       with no pupil code in the process
                                  │
                                  ▼
                       frames · won · steps · size · stars

The sandbox is hardened against escaping its container. It is not, and cannot be,
hardened against the program editing the interpreter it runs in — a pupil who can
write Python can write ``WORLD.goals.add(WORLD.here)``. So the sandbox is never
asked for a verdict. It is asked which commands were attempted, and a list of
command names has nothing to forge: it is replayed against the real grid here,
and that replay is the truth.

The simulator still runs inside the sandbox, because ``wall_ahead()`` has to
answer truthfully or the pupil's ``if`` branches the wrong way. Its opinion about
winning is thrown away.
"""

import ast
import json
import logging
from pathlib import Path

from app.exercises import robot_sim
from app.sandbox.executor import execute_code_remote

logger = logging.getLogger(__name__)

#: U+001E, the ASCII record separator. No child types it by accident, and the
#: backend splits on the *last* one — so a pupil who prints it anyway moves
#: nothing, because ours is still last.
SENTINEL = "\x1e--ROBOT-TRACE--"

#: A grid of at most a hundred cells under a step cap is far cheaper than a code
#: challenge. Same figures the public landing demo uses, for the same reason:
#: anything needing more is not a child solving a maze.
TIMEOUT_SECONDS = 5
MEMORY_LIMIT_MB = 128

#: What a pupil printed. Capped so a loop that prints cannot return a megabyte —
#: the step allowance stops it, but not before it has written.
OUTPUT_LIMIT = 8192

#: Read once per simulator module. Both worlds ship their own source into the
#: sandbox; everything else in this file is identical for either, which is why
#: it is parameterised rather than copied.
_SIM_SOURCES: dict[str, str] = {}


def _sim_source(sim) -> str:
    path = sim.__file__
    if path not in _SIM_SOURCES:
        _SIM_SOURCES[path] = Path(path).read_text(encoding="utf-8")
    return _SIM_SOURCES[path]


# The harness. Everything the pupil's program needs, and one print at the end.
#
# Their code is compiled under its own name rather than concatenated, so
# `SyntaxError.lineno` and every traceback frame count from *their* first line.
# Concatenating and subtracting a prelude offset works until the prelude changes
# length, and then misreports quietly for months.
_HARNESS = '''

# ─── harness ─────────────────────────────────────────────────────────
import json as _json
import sys as _sys

_LEVEL_JSON = {level!r}
_SOURCE = {source!r}
_SENTINEL = {sentinel!r}

_boot(_LEVEL_JSON)

_error = None


def _line_in_program(exc):
    """The last traceback frame that belongs to the pupil, not to us."""
    line = None
    tb = exc.__traceback__
    while tb is not None:
        if tb.tb_frame.f_code.co_filename == "program.py":
            line = tb.tb_lineno
        tb = tb.tb_next
    return line


try:
    exec(compile(_SOURCE, "program.py", "exec"), globals())
except SyntaxError as _exc:
    _error = {{"type": "SyntaxError", "line": _exc.lineno, "message": _exc.msg or ""}}
except StepsExhaustedError:
    _error = {{"type": "StepsExhausted", "line": None, "message": "steps_exhausted"}}
except SimError as _exc:
    _error = {{
        "type": type(_exc).__name__,
        "line": _line_in_program(_exc),
        "message": _exc.key,
    }}
except BaseException as _exc:  # noqa: BLE001 — anything a pupil writes is fair game
    _error = {{
        "type": type(_exc).__name__,
        "line": _line_in_program(_exc),
        "message": str(_exc),
    }}

_sys.stdout.write("\\n" + _SENTINEL + "\\n")
_sys.stdout.write(_json.dumps({{"commands": WORLD.commands, "error": _error}}))
'''


def build_program(level: dict, source: str, *, sim=robot_sim) -> str:
    """The single Python file the sandbox will run.

    ``json.dumps`` produces only escapes Python also understands, so a program
    that is nothing but quotes and backslashes embeds safely.

    ``sim`` chooses the world. It defaults to the 2D one so every existing call
    site reads as it did; ``world_sim`` is passed for a 3D level.
    """
    return _sim_source(sim) + _HARNESS.format(
        level=json.dumps(level),
        source=source,
        sentinel=SENTINEL,
    )


def parse_stdout(stdout: str) -> tuple[str, bool, dict]:
    """Split the sandbox's stdout into what the pupil printed and our trace.

    Returns ``(output, truncated, trace)``. A missing or unreadable trace yields
    an empty command list rather than an exception — the run then simply loses,
    which is the right answer for a program that broke the harness.
    """
    if SENTINEL not in stdout:
        return (*_cap(stdout), {"commands": [], "error": None})

    printed, _, tail = stdout.rpartition(SENTINEL)
    try:
        trace = json.loads(tail.strip() or "{}")
    except json.JSONDecodeError:
        logger.warning("robot trace was not JSON: %r", tail[:200])
        trace = {}

    return (
        *_cap(printed),
        {"commands": trace.get("commands") or [], "error": trace.get("error")},
    )


def _cap(text: str) -> tuple[str, bool]:
    text = text.strip("\n")
    if len(text) <= OUTPUT_LIMIT:
        return text, False
    return text[:OUTPUT_LIMIT], True


def count_statements(source: str) -> int:
    """Program size, for the third star.

    Counted with ``ast``, from the program the system ran — so block mode and
    Python mode are measured the same way and neither side reports its own
    figure. A program that does not parse has no size.
    """
    try:
        tree = ast.parse(source)
    except SyntaxError:
        return 0
    return sum(1 for node in ast.walk(tree) if isinstance(node, ast.stmt))


def stars(
    *, won: bool, steps: int, size: int, star_steps: int | None, star_size: int | None
) -> int:
    """0–3, from the run the server performed.

    A level with no thresholds set gives three for finishing — what the old
    behaviour did, and what a teacher who has not pressed Check expects.
    """
    if not won:
        return 0
    if star_steps is None and star_size is None:
        return 3
    earned = 1
    if star_steps is not None and steps <= star_steps:
        earned += 1
    if star_size is not None and size <= star_size:
        earned += 1
    return earned


async def run(level: dict, source: str, *, sim=robot_sim) -> dict:
    """Run a program against a level, returning the result of `contracts/api.md`.

    Raises ``RuntimeError`` when the sandbox did not answer, which the router
    turns into a 503 — nothing recorded, no attempt consumed.

    ``sim`` chooses the world: ``robot_sim`` for a 2D level, ``world_sim`` for a
    3D one. Both are asked the same two questions — which commands were
    attempted, and what happens when they are replayed — so everything from the
    sentinel down is shared rather than written twice.
    """
    result = await execute_code_remote(
        "python",
        build_program(level, source, sim=sim),
        stdin="",
        timeout_seconds=TIMEOUT_SECONDS,
        memory_limit_mb=MEMORY_LIMIT_MB,
    )

    if result.get("status") in ("error", "timeout"):
        raise RuntimeError(result.get("stderr") or "sandbox unavailable")

    output, truncated, trace = parse_stdout(result.get("stdout") or "")
    replayed = sim.replay(level, trace["commands"])

    error = trace["error"]
    stopped = replayed["stopped"]
    if error and stopped == "end_of_program":
        # The program broke after its last command took effect, so the replay
        # ran cleanly to the end of a list that simply stops early.
        stopped = "steps_exhausted" if error["type"] == "StepsExhausted" else "error"

    if stopped == "steps_exhausted":
        # Running out of the level's allowance is not a fault in the program.
        # `stopped` already says so, in words a child reads; passing the
        # simulator's own exception along as well printed
        # "StepsExhausted: steps_exhausted" underneath the plain sentence.
        error = None

    size = count_statements(source)
    return {
        "frames": replayed["frames"],
        "won": replayed["won"],
        "steps": replayed["steps"],
        "size": size,
        "stars": stars(
            won=replayed["won"],
            steps=replayed["steps"],
            size=size,
            star_steps=level.get("star_steps"),
            star_size=level.get("star_size"),
        ),
        "stopped": stopped,
        "output": output,
        "output_truncated": truncated,
        "error": error,
    }
