"""Safe SymPy parsing and the linear-system solver.

These helpers lived as private functions inside router.py. They moved here so
the exercise grader can reuse them: `math_system` has to solve a system while
marking a submission, and the alternative was a second parser with a second
sanitiser — the one thing this module must not have two of.

`parse_expr` evaluates the tokenised AST with `eval`, so everything reaching it
is filtered first: a length cap, a deny-list of tokens, and an allow-list of
characters. The route layer keeps turning failures into HTTP 400; the functions
here raise MathParseError so they are usable outside a request.
"""

from __future__ import annotations

import logging
import re

from sympy import Eq, Float, Integer, Rational, S, Symbol, expand, simplify, symbols
from sympy.parsing.sympy_parser import (
    convert_xor,
    implicit_multiplication_application,
    parse_expr,
    standard_transformations,
)
from sympy.solvers.solveset import linsolve

logger = logging.getLogger(__name__)

MAX_EXPR_LEN = 500
MAX_EQUATIONS = 6
MAX_VARIABLES = 4

_SAFE_EXPR = re.compile(r"^[0-9a-zA-Zа-яА-ЯёЁ\s\+\-\*\/\^\(\)\[\]\{\}\.\,\=\_\|]+$")
SAFE_VARIABLE = re.compile(r"^[a-zA-Z]\w{0,15}$")

_TR = standard_transformations + (implicit_multiplication_application, convert_xor)

_ALLOWED_NAMES = {c: Symbol(c) for c in "abcdefghijklmnopqrstuvwxyz"}

# parse_expr() evaluates the tokenized AST with eval(); with an empty
# global_dict the eval cannot find the numeric wrappers it needs to turn `4.5`
# into Float(4.5) and raises NameError. These four are the minimum for
# arithmetic literals — no functions exposed, and the sanitiser still blocks
# names before anything reaches here.
_PARSE_GLOBAL_DICT: dict[str, object] = {
    "Integer": Integer,
    "Float": Float,
    "Rational": Rational,
    "Symbol": Symbol,
}


class MathParseError(ValueError):
    """Input that cannot be parsed, or that the sanitiser refuses."""


def sanitize_expression(s: str) -> str:
    """Reject expressions that could trigger code execution in SymPy's eval."""
    if len(s) > MAX_EXPR_LEN:
        raise MathParseError(f"Expression too long (max {MAX_EXPR_LEN} chars)")
    if "__" in s or "import" in s or "eval" in s or "exec" in s:
        raise MathParseError("Forbidden token in expression")
    if not _SAFE_EXPR.match(s):
        raise MathParseError("Expression contains disallowed characters")
    return s


def parse_expression(s: str):
    """Parse a math string into a SymPy expression."""
    if not s or not isinstance(s, str):
        raise MathParseError("Expression is empty")
    cleaned = sanitize_expression(s.strip())
    try:
        return parse_expr(
            cleaned,
            local_dict=_ALLOWED_NAMES,
            global_dict=_PARSE_GLOBAL_DICT,
            transformations=_TR,
            evaluate=True,
        )
    except Exception as e:  # noqa: BLE001
        # SymPy raises TokenError, SympifyError, AttributeError and more, none
        # of which share a base class worth catching narrowly.
        logger.info("math parse failed for %r: %s", s, e)
        raise MathParseError(f"Cannot parse '{s}': {e}") from e


def parse_equation(s: str) -> Eq:
    """Parse 'x + 2y = 5' into a SymPy Eq. No '=' means '= 0'."""
    if "=" not in s:
        return Eq(parse_expression(s), S.Zero)
    lhs, _, rhs = s.partition("=")
    return Eq(parse_expression(lhs), parse_expression(rhs))


def are_equivalent(a, b) -> bool:
    """SymPy-correct equivalence test, so 1/2 and 0.5 are the same answer."""
    try:
        return bool(simplify(a - b) == 0)
    except Exception as e:  # noqa: BLE001
        logger.debug("equivalence check failed: %s", e)
        try:
            return bool(expand(a) == expand(b))
        except Exception:
            return False


def solve_linear_system(equations: list[str], variables: list[str]) -> dict:
    """Solve a system of linear equations.

    Returns one of three shapes, because those three outcomes are the topic:

        {"kind": "unique",   "values": {"x": "2", "y": "-1"}}
        {"kind": "none"}                      parallel lines
        {"kind": "infinite"}                  the same line twice

    Raises MathParseError on anything unreadable, and on a system too large to
    be a school exercise — the caps are there so a malformed config cannot hand
    SymPy an unbounded problem inside a request.
    """
    if not equations:
        raise MathParseError("No equations given")
    if len(equations) > MAX_EQUATIONS:
        raise MathParseError(f"Too many equations (max {MAX_EQUATIONS})")
    if not variables:
        raise MathParseError("No variables given")
    if len(variables) > MAX_VARIABLES:
        raise MathParseError(f"Too many variables (max {MAX_VARIABLES})")

    for name in variables:
        if not SAFE_VARIABLE.match(name):
            raise MathParseError(f"Invalid variable name '{name}'")

    syms = symbols(" ".join(variables))
    sym_list = list(syms) if isinstance(syms, tuple) else [syms]

    parsed = [parse_equation(eq) for eq in equations]

    try:
        result = linsolve(parsed, sym_list)
    except Exception as e:  # noqa: BLE001
        # linsolve raises on a non-linear system, which is a config mistake
        # rather than a server fault.
        logger.info("linsolve failed for %r: %s", equations, e)
        raise MathParseError(f"Cannot solve this system: {e}") from e

    if not result:
        return {"kind": "none"}

    (solution,) = list(result)

    # A solution still containing one of the unknowns means the system never
    # pinned it down — two equations describing the same line, for instance.
    if any(value.free_symbols & set(sym_list) for value in solution):
        return {"kind": "infinite"}

    return {
        "kind": "unique",
        "values": {name: str(value) for name, value in zip(variables, solution)},
    }


def solutions_match(expected: dict, given: dict, variables: list[str]) -> bool:
    """Compare a student's answer with the solved system.

    Values go through SymPy, so "1/2", "0.5" and "2/4" all count as the same
    answer — the exercise is about solving the system, not about guessing which
    form the marker wanted.
    """
    if expected.get("kind") != given.get("kind"):
        return False
    if expected["kind"] != "unique":
        return True

    expected_values = expected.get("values") or {}
    given_values = given.get("values") or {}

    for name in variables:
        if name not in given_values:
            return False
        try:
            a = parse_expression(str(expected_values.get(name, "")))
            b = parse_expression(str(given_values.get(name, "")))
        except MathParseError:
            return False
        if not are_equivalent(a, b):
            return False
    return True
