"""Everything wrong with a 3D level, reported at once.

Codes, never sentences: the editor renders them in the teacher's language, in
six locales. A message built here would be English forever.

Every fault is returned together rather than one at a time. A teacher who fixes
a level three times because each save reveals the next problem learns to dread
the button.

What this does *not* answer is whether the level can be finished — that is the
solver's job, and it needs to search. These are the faults you can see by
reading the level.
"""

from app.exercises.world_sim import ACTIONS, COMMANDS, SENSORS


def check(level: dict) -> list[dict]:
    """Return one entry per fault. An empty list means nothing is wrong here."""
    blockers: list[dict] = []

    width = int(level.get("grid_width", 6))
    depth = int(level.get("grid_depth", 6))
    cells = level.get("cells") or []
    commands = set(level.get("commands") or [])
    win = level.get("win") or {}

    goals = [c for c in cells if c.get("type") == "goal"]
    items = [c for c in cells if c.get("type") == "item"]
    buttons = [c for c in cells if c.get("type") == "button"]
    doors = [c for c in cells if c.get("type") == "door"]
    walls = {(c["x"], c["z"]) for c in cells if c.get("type") == "wall"}
    platforms = [c for c in cells if c.get("type") == "platform"]

    # ── The start ────────────────────────────────────────────────────
    start = level.get("start") or {}
    sx, sz = int(start.get("x", 0)), int(start.get("z", 0))
    if not (0 <= sx < width and 0 <= sz < depth):
        blockers.append({"code": "start_off_grid"})
    if (sx, sz) in walls:
        blockers.append({"code": "start_on_wall"})
    if any(d["x"] == sx and d["z"] == sz for d in doors):
        blockers.append({"code": "start_in_door"})

    # ── The goal ─────────────────────────────────────────────────────
    if len(goals) > 1:
        blockers.append({"code": "two_goals"})
    if not goals and _needs(win, "at_goal"):
        blockers.append({"code": "no_goal"})
    for goal in goals:
        # Any platform on the square buries the flag, floor 0 included. A
        # platform occupies the floor it is recorded at, so every one of them
        # stands above the ground the goal sits on. This used to test for a
        # platform above floor 0, back when floor 0 was the ground itself.
        buried = any(p["x"] == goal["x"] and p["z"] == goal["z"] for p in platforms)
        if buried:
            blockers.append({"code": "goal_under_platform"})
            break

    # ── Items ────────────────────────────────────────────────────────
    if any((i["x"], i["z"]) in walls for i in items):
        blockers.append({"code": "item_on_wall"})

    squares = [(i["x"], i["z"]) for i in items]
    if len(squares) != len(set(squares)):
        blockers.append({"code": "two_items_on_square"})

    # ── Buttons and doors ────────────────────────────────────────────
    door_ids = {str(d.get("id") or f"door_{d['x']}_{d['z']}") for d in doors}
    opened_by = {str(b.get("opens") or "") for b in buttons}

    if any(not b.get("opens") or str(b["opens"]) not in door_ids for b in buttons):
        blockers.append({"code": "button_without_door"})
    if any(door_id not in opened_by for door_id in door_ids):
        blockers.append({"code": "door_without_button"})

    # ── What the win condition asks for ──────────────────────────────
    if _needs(win, "all_items_taken") and not items:
        blockers.append({"code": "win_needs_items_but_none"})
    if _needs(win, "all_buttons_pressed") and not buttons:
        blockers.append({"code": "win_needs_buttons_but_none"})

    # ── The vocabulary ───────────────────────────────────────────────
    if not commands:
        blockers.append({"code": "no_commands"})
    else:
        offered_sensors = sorted(commands & set(SENSORS))
        if offered_sensors and not (commands & set(ACTIONS)):
            # A level offering something to look at, and nothing to do with what
            # it sees.
            blockers.append({"code": "sensor_without_use", "commands": offered_sensors})

        unknown = sorted(commands - set(COMMANDS))
        if unknown:
            blockers.append({"code": "unknown_command", "commands": unknown})

    return blockers


def _needs(node, cond: str) -> bool:
    """Does this win condition mention `cond`, at any depth?"""
    if not isinstance(node, dict):
        return False
    if node.get("cond") == cond:
        return True
    return any(_needs(child, cond) for child in node.get("of") or [])
