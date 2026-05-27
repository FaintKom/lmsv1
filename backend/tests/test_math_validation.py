"""Math validation regression tests.

Locks in the parser bug fix from 2026-05-27: passing `global_dict={}`
to `parse_expr()` stripped SymPy's numeric wrappers (Integer / Float /
Rational), so any expression with a decimal or fraction literal raised
`NameError: name 'Float' is not defined` and the route returned 500.
User-visible symptom: the math_stepwise exercise showed both
"Cannot check answer (parse error)" and "Server error. Please try again
later." on every submit that involved a decimal.

These tests poke `_parse_answer_set` and `_parse` directly so we don't
need the FastAPI client + auth dance for the regression — the bug is
purely in the parser wiring.
"""
from __future__ import annotations

import pytest

from app.math_validation.router import _parse, _parse_answer_set


def _str_set(s: set) -> set[str]:
    return {str(x) for x in s}


class TestParserAcceptsLiterals:
    """`_parse` must handle every literal form the student UI can emit."""

    @pytest.mark.parametrize(
        "expr,expected_str",
        [
            ("4", "4"),
            ("4.5", "4.50000000000000"),
            ("1/2", "1/2"),
            ("2*x", "2*x"),
            ("2x", "2*x"),
            ("x^2 - 5x + 6", "x**2 - 5*x + 6"),
        ],
    )
    def test_parses(self, expr: str, expected_str: str) -> None:
        assert str(_parse(expr)) == expected_str


class TestAnswerSetParsing:
    """`_parse_answer_set` strips the optional "x = " prefix, splits on
    or / comma / semicolon, and returns a SymPy-expression set."""

    def test_decimal_answer(self) -> None:
        # Regression: `x=4.5` used to 500 because Float wasn't in global_dict.
        assert _str_set(_parse_answer_set("x=4.5")) == {"4.50000000000000"}

    def test_integer_answer(self) -> None:
        assert _str_set(_parse_answer_set("x=4")) == {"4"}

    def test_bare_number(self) -> None:
        assert _str_set(_parse_answer_set("4")) == {"4"}
        assert _str_set(_parse_answer_set("4.5")) == {"4.50000000000000"}

    def test_multiple_solutions_or(self) -> None:
        assert _str_set(_parse_answer_set("x = 2 or x = 3")) == {"2", "3"}

    def test_multiple_solutions_comma(self) -> None:
        assert _str_set(_parse_answer_set("x = 2, x = 3")) == {"2", "3"}

    def test_multiple_solutions_semicolon(self) -> None:
        assert _str_set(_parse_answer_set("x=2; x=3")) == {"2", "3"}

    def test_fraction_answer(self) -> None:
        assert _str_set(_parse_answer_set("x = 1/2")) == {"1/2"}

    def test_empty_input(self) -> None:
        assert _parse_answer_set("") == set()
        assert _parse_answer_set("   ") == set()

    def test_unparseable_parts_skipped_not_raised(self) -> None:
        # Bad parts must be silently dropped — the caller compares two
        # sets and decides correctness; it shouldn't get a 500 just
        # because the student typed something weird.
        result = _parse_answer_set("x = 2 or x = banana(garbage")
        # The "banana(garbage" part is bad, "2" must still survive.
        assert "2" in _str_set(result)
