"""Tasks for the public landing-page demo, and the harness that grades them.

Kept in code rather than the database on purpose: nobody edits these, they ship
with the page, and a public endpoint should not need a database read to answer.

The point of the demo is that **the server is the judge** — the same property
that makes the product trustworthy for a teacher. So the expected values never
leave this file: the browser posts a solution and gets back per-test verdicts.
It cannot see the answers, and it cannot mark itself correct.
"""

from __future__ import annotations

import json
import secrets
from dataclasses import dataclass


@dataclass(frozen=True)
class DemoTest:
    """One visible test case. `args` are passed to the submitted function."""

    name: str
    args: tuple
    expected: object


@dataclass(frozen=True)
class DemoTask:
    id: str
    function_name: str
    #: language -> starter code shown in the editor
    starters: dict[str, str]
    tests: tuple[DemoTest, ...]


COUNT_VOWELS = DemoTask(
    id="count_vowels",
    function_name="count_vowels",
    starters={
        "python": (
            "def count_vowels(text):\n"
            "    # Return how many vowels (a, e, i, o, u) the text contains.\n"
            "    return 0\n"
        ),
        "javascript": (
            "function count_vowels(text) {\n"
            "  // Return how many vowels (a, e, i, o, u) the text contains.\n"
            "  return 0;\n"
            "}\n"
        ),
    },
    tests=(
        DemoTest(name="count_vowels('education')", args=("education",), expected=5),
        DemoTest(name="count_vowels('rhythm')", args=("rhythm",), expected=0),
        DemoTest(name="count_vowels('')", args=("",), expected=0),
    ),
)

SUM_EVEN = DemoTask(
    id="sum_even",
    function_name="sum_even",
    starters={
        "python": (
            "def sum_even(numbers):\n"
            "    # Return the sum of the even numbers in the list.\n"
            "    return 0\n"
        ),
        "javascript": (
            "function sum_even(numbers) {\n"
            "  // Return the sum of the even numbers in the array.\n"
            "  return 0;\n"
            "}\n"
        ),
    },
    tests=(
        DemoTest(name="sum_even([1, 2, 3, 4])", args=([1, 2, 3, 4],), expected=6),
        DemoTest(name="sum_even([7])", args=([7],), expected=0),
        DemoTest(name="sum_even([])", args=([],), expected=0),
    ),
)

DEMO_TASKS: dict[str, DemoTask] = {t.id: t for t in (COUNT_VOWELS, SUM_EVEN)}


def new_nonce() -> str:
    return "__" + secrets.token_hex(8) + "__"


def build_program(task: DemoTask, language: str, source_code: str, nonce: str) -> str:
    """Wrap the submitted solution in a runner that reports every test result.

    The nonce is generated per request and prefixes the results line. Without
    it a submission could simply print a passing result and grade itself — not
    a security hole (there is nothing to win) but it would make the demo a
    liar, which is the exact thing this page exists to stop being.
    """
    args_json = json.dumps([list(t.args) for t in task.tests])

    if language == "python":
        return (
            f"{source_code}\n\n"
            "import json as _json\n"
            f"_cases = _json.loads({args_json!r})\n"
            "_out = []\n"
            "for _a in _cases:\n"
            "    try:\n"
            f"        _out.append({task.function_name}(*_a))\n"
            "    except Exception as _e:\n"
            "        _out.append('__ERROR__: ' + str(_e))\n"
            f"print({nonce!r} + _json.dumps(_out, default=str))\n"
        )

    if language == "javascript":
        return (
            f"{source_code}\n\n"
            f"const _cases = {args_json};\n"
            "const _out = _cases.map((a) => {\n"
            "  try {\n"
            f"    return {task.function_name}(...a);\n"
            "  } catch (e) {\n"
            "    return '__ERROR__: ' + e.message;\n"
            "  }\n"
            "});\n"
            f"console.log({nonce!r} + JSON.stringify(_out));\n"
        )

    raise ValueError(f"no harness for language: {language}")


def parse_results(stdout: str, nonce: str) -> list | None:
    """Pull the results array back out of stdout, or None if it is not there.

    Whatever the solution printed on its own is ignored — only the
    nonce-prefixed line counts, and the last one wins so a stray print cannot
    shadow the real one.
    """
    for line in reversed(stdout.splitlines()):
        if line.startswith(nonce):
            try:
                return json.loads(line[len(nonce) :])
            except json.JSONDecodeError:
                return None
    return None
