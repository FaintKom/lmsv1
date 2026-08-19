"""Everything wrong with a level, in one pass.

Two rules shape this module.

**It reports all of it.** A checker that returns the first fault makes a teacher
save five times to learn five things. Every check runs, and the caller gets the
whole list.

**Every code is a key.** ``win_needs_goal``, never "This level needs a goal." The
editor renders it in the teacher's language; an English sentence crossing the
wire is a string nobody can translate (FR-020, FR-023).

What is *not* here: whether the goal can actually be reached. That is a search,
it lives in ``robot_solver``, and it costs far more than any of these.
"""

from app.exercises.robot_sim import COMMANDS, PAINT_COLORS

#: Item looks the renderer knows how to draw. Visual only — no rule reads them.
ITEM_KINDS = frozenset({"gem", "key", "apple", "flag"})

FACING_COMMANDS = frozenset({"move_forward", "turn_left", "turn_right"})
SENSORS = frozenset({"wall_ahead", "item_here", "at_goal", "painted", "value_here"})

#: What each win condition needs the grid, or the command set, to contain.
#: Data rather than branches, so a new condition adds a row.
NEEDS = {
    "at_goal": {"cell": "goal", "code": "win_needs_goal"},
    "all_items_taken": {
        "cell": "item",
        "code": "win_needs_items",
        "command": "take",
        "command_code": "win_needs_take_command",
    },
    "all_marks_painted": {
        "cell": "mark",
        "code": "win_needs_marks",
        "command": "paint",
        "command_code": "win_needs_paint_command",
    },
    "all_values_read": {
        "cell": "value",
        "code": "win_needs_values",
        "command": "read",
        "command_code": "win_needs_read_command",
    },
    "values_total": {"cell": "value", "code": "win_needs_values"},
}


def check(level: dict) -> list[dict]:
    """Every reason this level is not ready. Empty when it is."""
    width = int(level.get("grid_width", 5))
    height = int(level.get("grid_height", 5))
    cells = level.get("cells") or []
    commands = level.get("commands") or []
    start = level.get("start") or {}

    blockers: list[dict] = []

    def add(code: str, **extra):
        if not any(b["code"] == code for b in blockers):
            blockers.append({"code": code, **extra})

    # ─── The grid ────────────────────────────────────────────────────

    sx, sy = int(start.get("x", 0)), int(start.get("y", 0))
    if not (0 <= sx < width and 0 <= sy < height):
        add("start_off_grid")

    seen: set[tuple[int, int]] = set()
    for cell in cells:
        pos = (int(cell.get("x", 0)), int(cell.get("y", 0)))
        kind = cell.get("type", "empty")

        if not (0 <= pos[0] < width and 0 <= pos[1] < height):
            add("cell_off_grid")
        if pos in seen:
            add("duplicate_cell")
        seen.add(pos)

        if kind == "wall":
            if pos == (sx, sy):
                add("start_on_wall")
            if cell.get("mark"):
                add("mark_on_wall")
            if cell.get("value") is not None:
                add("value_on_wall")

        color = cell.get("mark_color")
        if color:
            if color not in PAINT_COLORS:
                add("bad_mark_color", colors=sorted(PAINT_COLORS))
            if not cell.get("mark"):
                add("color_without_mark")

        look = cell.get("kind")
        if look:
            if look not in ITEM_KINDS:
                add("bad_item_kind", kinds=sorted(ITEM_KINDS))
            if kind != "item":
                add("kind_without_item")

    if sum(1 for c in cells if c.get("type") == "goal") > 1:
        add("two_goals")

    # ─── The command set ─────────────────────────────────────────────

    if not commands:
        add("no_commands")

    unknown = [c for c in commands if c not in COMMANDS]
    if unknown:
        add("unknown_command", commands=unknown)

    offered_sensors = [c for c in commands if c in SENSORS]
    if offered_sensors and not any(c in FACING_COMMANDS for c in commands):
        add("sensor_without_facing", commands=offered_sensors)

    # A coloured mark nothing can paint is a level nobody can win.
    if any(c.get("mark_color") for c in cells) and "paint" not in commands:
        add("win_needs_paint_command")

    # ─── A goal nothing on the grid can satisfy (FR-032) ─────────────

    present = {
        "goal": any(c.get("type") == "goal" for c in cells),
        "item": any(c.get("type") == "item" for c in cells),
        "mark": any(c.get("mark") for c in cells),
        "value": any(c.get("value") is not None for c in cells),
    }

    for condition in _conditions(level.get("win")):
        need = NEEDS.get(condition)
        if not need:
            continue
        if not present[need["cell"]]:
            add(need["code"])
        command = need.get("command")
        if command and command not in commands:
            add(need["command_code"])

    return blockers


def _conditions(node) -> set[str]:
    """Every leaf condition in the expression, however deeply nested.

    A fault can sit in any branch of an ``and``, an ``or`` or a ``not``, so
    checking only the top level would pass a level whose second clause nothing
    on the grid satisfies.
    """
    if not isinstance(node, dict):
        return set()
    if node.get("cond"):
        return {node["cond"]}

    found: set[str] = set()
    for child in node.get("of") or []:
        found |= _conditions(child)
    return found
