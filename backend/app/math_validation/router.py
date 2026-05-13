"""Math validation endpoints — SymPy-backed.

Endpoints (all POST, JSON body, all require an authenticated user):
    /validate-step   — check algebraic equivalence of two expressions
    /check-answer    — compare a student final answer to expected
    /solve           — solve equation(s) for a variable
    /factor          — factor a polynomial
    /simplify        — simplify an expression
    /steps           — return a sequence of canonical solution steps

Input format: plain-text math (Python-ish: `x**2 - 5*x + 6`).
Caret `^` is auto-rewritten to `**`. Implicit multiplication (`5x`)
is supported via SymPy's standard transformations.
LaTeX is NOT parsed by default (would require antlr4); pass plain
ASCII or already-converted strings.
"""
from __future__ import annotations

import logging
import re
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sympy import Eq, S, Symbol, expand, factor, simplify, solveset, sympify
from sympy.parsing.sympy_parser import (
    convert_xor,
    implicit_multiplication_application,
    parse_expr,
    standard_transformations,
)

from app.auth.dependencies import get_current_user
from app.auth.models import User

logger = logging.getLogger(__name__)
router = APIRouter()


_TR = standard_transformations + (
    implicit_multiplication_application,
    convert_xor,
)


def _parse(s: str):
    """Parse a math string into a SymPy expression.

    Raises HTTPException(400) on failure so the route returns a clean error.
    """
    if not s or not isinstance(s, str):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Expression is empty")
    try:
        return parse_expr(s, transformations=_TR, evaluate=True)
    except (SyntaxError, ValueError, TypeError) as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Cannot parse '{s}': {e}")


def _parse_equation(s: str) -> Eq:
    """Parse 'x^2 - 5x + 6 = 0' into a SymPy Eq. No '=' => Eq(expr, 0)."""
    if "=" not in s:
        return Eq(_parse(s), S.Zero)
    lhs, _, rhs = s.partition("=")
    return Eq(_parse(lhs), _parse(rhs))


def _are_equivalent(a, b) -> bool:
    """SymPy-correct equivalence test for two expressions."""
    try:
        return bool(simplify(a - b) == 0)
    except Exception as e:  # noqa: BLE001
        logger.debug("equivalence check failed: %s", e)
        try:
            return bool(expand(a) == expand(b))
        except Exception:
            return False


_ALT_SEP = re.compile(r"\s*(?:or|\bили\b|,|;)\s*", re.IGNORECASE)


def _parse_answer_set(s: str) -> set:
    """Parse a student answer that may list multiple solutions.

    Accepts: "2", "x = 2", "x = 2 or 3", "x = 2, x = 3", "x=2; x=3".
    """
    s = (s or "").strip()
    if not s:
        return set()
    parts = _ALT_SEP.split(s)
    out: set = set()
    for p in parts:
        p = p.strip()
        if not p:
            continue
        m = re.match(r"^[A-Za-z]\w*\s*=\s*(.*)$", p)
        if m:
            p = m.group(1).strip()
        try:
            out.add(sympify(_parse(p)))
        except HTTPException:
            continue
    return out


# ─── Schemas ────────────────────────────────────────────────────────────


class ValidateStepIn(BaseModel):
    prev_expression: str = Field(..., examples=["x^2 - 5x + 6"])
    new_expression: str = Field(..., examples=["(x-2)(x-3)"])


class ValidateStepOut(BaseModel):
    equivalent: bool
    note: str | None = None


class CheckAnswerIn(BaseModel):
    student: str
    expected: str
    variable: str | None = "x"


class CheckAnswerOut(BaseModel):
    correct: bool
    student_parsed: list[str]
    expected_parsed: list[str]


class SolveIn(BaseModel):
    equation: str = Field(..., examples=["x^2 - 5x + 6 = 0"])
    variable: str | None = "x"


class SolveOut(BaseModel):
    solutions: list[str]
    equation: str


class ExpressionIn(BaseModel):
    expression: str


class FactorOut(BaseModel):
    factored: str


class SimplifyOut(BaseModel):
    simplified: str


class StepsOut(BaseModel):
    steps: list[dict[str, Any]]


# ─── Endpoints ──────────────────────────────────────────────────────────


@router.post("/validate-step", response_model=ValidateStepOut)
async def validate_step(body: ValidateStepIn, user: User = Depends(get_current_user)) -> ValidateStepOut:
    """True iff `new_expression` is algebraically equivalent to `prev_expression`."""
    a = _parse(body.prev_expression)
    b = _parse(body.new_expression)
    eq = _are_equivalent(a, b)
    return ValidateStepOut(
        equivalent=eq,
        note=None if eq else "Not equivalent — expand both sides and re-check.",
    )


@router.post("/check-answer", response_model=CheckAnswerOut)
async def check_answer(body: CheckAnswerIn, user: User = Depends(get_current_user)) -> CheckAnswerOut:
    """Compare a student final answer to the teacher's expected answer."""
    student = _parse_answer_set(body.student)
    expected = _parse_answer_set(body.expected)
    return CheckAnswerOut(
        correct=student == expected and len(expected) > 0,
        student_parsed=sorted(str(x) for x in student),
        expected_parsed=sorted(str(x) for x in expected),
    )


@router.post("/solve", response_model=SolveOut)
async def solve_equation(body: SolveIn, user: User = Depends(get_current_user)) -> SolveOut:
    var = Symbol(body.variable or "x")
    eq = _parse_equation(body.equation)
    try:
        sol = solveset(eq, var, domain=S.Complexes)
        sols: list[str] = []
        try:
            for s in sol:  # type: ignore[assignment]
                sols.append(str(s))
        except TypeError:
            sols = [str(sol)]
        return SolveOut(solutions=sols, equation=str(eq))
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Cannot solve: {e}")


@router.post("/factor", response_model=FactorOut)
async def factor_expression(body: ExpressionIn, user: User = Depends(get_current_user)) -> FactorOut:
    expr = _parse(body.expression)
    return FactorOut(factored=str(factor(expr)))


@router.post("/simplify", response_model=SimplifyOut)
async def simplify_expression(body: ExpressionIn, user: User = Depends(get_current_user)) -> SimplifyOut:
    expr = _parse(body.expression)
    return SimplifyOut(simplified=str(simplify(expr)))


@router.post("/steps", response_model=StepsOut)
async def equation_steps(body: SolveIn, user: User = Depends(get_current_user)) -> StepsOut:
    """Generate a canonical sequence of steps to solve the equation.

    MVP step-generator used by `math_stepwise` to seed the "expected
    steps" hint sequence a teacher can show students. Sequence:
        1. Move everything to the left side: lhs - rhs = 0
        2. Factor / expand as appropriate
        3. State the solutions
    """
    var = Symbol(body.variable or "x")
    eq = _parse_equation(body.equation)
    steps: list[dict[str, Any]] = []
    canonical = eq.lhs - eq.rhs
    steps.append({"description": "Move all terms to one side", "expression": f"{canonical} = 0"})
    factored = factor(canonical)
    if factored != canonical:
        steps.append({"description": "Factor the expression", "expression": f"{factored} = 0"})
    try:
        sols = list(solveset(Eq(canonical, 0), var, domain=S.Complexes))
        if sols:
            steps.append(
                {
                    "description": "Solutions",
                    "expression": ", ".join(f"{var} = {s}" for s in sols),
                }
            )
    except Exception:
        pass
    return StepsOut(steps=steps)
