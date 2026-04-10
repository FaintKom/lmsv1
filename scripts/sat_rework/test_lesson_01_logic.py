"""Trace the lesson 1 widget logic in Python to verify each problem
is solvable end-to-end with the buttons we expose.

This is a port of the JS state machine to Python. If this script prints
"x = N solved" for all 4 problems, the JS in the iframe will too —
the logic is identical and there is no DOM dependency.
"""
from __future__ import annotations
from copy import deepcopy


# Each problem mirrors the JS `problems` array.
PROBLEMS = [
    {
        "label": "3x + 7 = 22",
        "start": {"L": [3, 7], "R": [0, 22]},
        "ops": ["-7", "/3"],
        "expected_x": 5,
    },
    {
        "label": "5x − 4 = 16",
        "start": {"L": [5, -4], "R": [0, 16]},
        "ops": ["+4", "/5"],
        "expected_x": 4,
    },
    {
        "label": "2(x + 3) = 14",
        "start": {"L": [0, 0], "R": [0, 14]},  # filled by distribute
        "distOf": [2, 6, 0, 14],
        "ops": ["distribute", "-6", "/2"],
        "expected_x": 4,
    },
    {
        "label": "4x + 9 = 2x + 17",
        "start": {"L": [4, 9], "R": [2, 17]},
        "ops": ["-2x", "-9", "/2"],
        "expected_x": 4,
    },
]


def fmt_side(s: list[int]) -> str:
    a, b = s
    if a == 0 and b == 0:
        return "0"
    if a == 0:
        return str(b)
    x = "x" if a == 1 else ("-x" if a == -1 else f"{a}x")
    if b == 0:
        return x
    return x + (f" + {b}" if b > 0 else f" - {-b}")


def apply_op(state: dict, distributed: bool, distOf, op: str) -> tuple[dict, bool, str | None]:
    """Returns (new_state, new_distributed, error_or_none)."""
    if op == "distribute":
        if distOf and not distributed:
            d = distOf
            return ({"L": [d[0], d[1]], "R": [d[2], d[3]]}, True, None)
        return (state, distributed, "nothing to distribute")

    if op == "-2x":
        s = deepcopy(state)
        s["L"][0] -= 2
        s["R"][0] -= 2
        return (s, distributed, None)

    if op[0] == "+":
        n = int(op[1:])
        s = deepcopy(state)
        s["L"][1] += n
        s["R"][1] += n
        return (s, distributed, None)

    if op[0] == "-" and op != "-2x":
        n = int(op[1:])
        s = deepcopy(state)
        s["L"][1] -= n
        s["R"][1] -= n
        return (s, distributed, None)

    if op[0] == "/":
        d2 = int(op[1:])
        if (
            state["L"][1] == 0
            and state["R"][0] == 0
            and state["L"][0] % d2 == 0
            and state["R"][1] % d2 == 0
        ):
            s = deepcopy(state)
            s["L"][0] //= d2
            s["R"][1] //= d2
            return (s, distributed, None)
        if state["L"][1] != 0:
            return (state, distributed, "remove constant on left first")
        if state["R"][0] != 0:
            return (state, distributed, "remove variable on right first")
        return (state, distributed, "won't give whole numbers")

    return (state, distributed, f"unknown op {op}")


def solve(prob: dict) -> bool:
    state = deepcopy(prob["start"])
    distributed = False
    distOf = prob.get("distOf")

    print(f"\n=== {prob['label']} ===")
    print(f"  start: {fmt_side(state['L'])} = {fmt_side(state['R'])}")
    for op in prob["ops"]:
        new_state, distributed, err = apply_op(state, distributed, distOf, op)
        if err:
            print(f"  {op} → ERROR: {err}")
            return False
        state = new_state
        print(f"  after {op}: {fmt_side(state['L'])} = {fmt_side(state['R'])}")

    is_solved = (
        state["L"][0] == 1
        and state["L"][1] == 0
        and state["R"][0] == 0
    )
    if is_solved:
        x = state["R"][1]
        ok = x == prob["expected_x"]
        marker = "✓" if ok else "✗"
        print(f"  {marker} solved: x = {x} (expected {prob['expected_x']})")
        return ok
    print("  ✗ not solved")
    return False


def main() -> int:
    all_ok = True
    for p in PROBLEMS:
        if not solve(p):
            all_ok = False
    print()
    print("ALL OK" if all_ok else "FAILURES — fix widget JS")
    return 0 if all_ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
