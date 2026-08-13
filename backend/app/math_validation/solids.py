"""Volume and surface area of the solids school stereometry actually asks about.

The marking model for `stereometry` is the same as for `math_system`: the
config a student receives carries the shape and its measurements but no
answer, and the server recomputes the expected number at marking time. A
stored answer key would be a second copy of the truth to keep in sync, and
one more thing to strip out of every student payload.

Deliberately plain arithmetic, not SymPy. These are five formulas with no
symbols in them, and `math_validation.service` exists to guard `parse_expr`
— code that never touches a user-written expression has no business going
through it. It is filed here anyway because this is where "the server works
out the right answer" lives.
"""

import math

__all__ = [
    "SOLIDS",
    "QUANTITIES",
    "SolidError",
    "compute",
    "dimensions_for",
]


class SolidError(ValueError):
    """A solid, quantity or measurement the formulas cannot be applied to."""


# What each solid must be given, in the order a teacher would say it.
SOLIDS: dict[str, tuple[str, ...]] = {
    # Rectangular box: edges a, b, c.
    "box": ("a", "b", "c"),
    # Right pyramid on a square base: base edge a, height h.
    "pyramid": ("a", "h"),
    "cylinder": ("r", "h"),
    "cone": ("r", "h"),
    "sphere": ("r",),
}

QUANTITIES = ("volume", "surface_area", "lateral_area")


def dimensions_for(solid: str) -> tuple[str, ...]:
    """The measurements this solid needs. Used by the config editor."""
    if solid not in SOLIDS:
        raise SolidError(f"Unknown solid: {solid}")
    return SOLIDS[solid]


def _validated(solid: str, dimensions: dict) -> dict[str, float]:
    if solid not in SOLIDS:
        raise SolidError(f"Unknown solid: {solid}")
    if not isinstance(dimensions, dict):
        raise SolidError("Dimensions must be given as an object")

    values: dict[str, float] = {}
    for name in SOLIDS[solid]:
        raw = dimensions.get(name)
        if raw is None:
            raise SolidError(f"A {solid} needs a value for {name}")
        # bool is an int in Python, and True would quietly become 1.
        if isinstance(raw, bool) or not isinstance(raw, (int, float)):
            raise SolidError(f"{name} must be a number, got {raw!r}")
        value = float(raw)
        if not math.isfinite(value) or value <= 0:
            raise SolidError(f"{name} must be a positive number, got {raw!r}")
        values[name] = value
    return values


def compute(solid: str, dimensions: dict, quantity: str) -> float:
    """The exact value of `quantity` for `solid`, or raise SolidError.

    A sphere's lateral area is its whole surface — there is no base to leave
    out. That is answered rather than refused, so a teacher who picks it by
    accident gets the right number instead of a broken exercise.
    """
    if quantity not in QUANTITIES:
        raise SolidError(f"Unknown quantity: {quantity}")

    d = _validated(solid, dimensions)

    if solid == "box":
        a, b, c = d["a"], d["b"], d["c"]
        if quantity == "volume":
            return a * b * c
        lateral = 2 * c * (a + b)
        return lateral if quantity == "lateral_area" else lateral + 2 * a * b

    if solid == "pyramid":
        a, h = d["a"], d["h"]
        if quantity == "volume":
            return a * a * h / 3
        # Slant height to the middle of a base edge, not to a corner.
        apothem = math.hypot(h, a / 2)
        lateral = 2 * a * apothem
        return lateral if quantity == "lateral_area" else lateral + a * a

    if solid == "cylinder":
        r, h = d["r"], d["h"]
        if quantity == "volume":
            return math.pi * r * r * h
        lateral = 2 * math.pi * r * h
        return lateral if quantity == "lateral_area" else lateral + 2 * math.pi * r * r

    if solid == "cone":
        r, h = d["r"], d["h"]
        if quantity == "volume":
            return math.pi * r * r * h / 3
        slant = math.hypot(r, h)
        lateral = math.pi * r * slant
        return lateral if quantity == "lateral_area" else lateral + math.pi * r * r

    # sphere
    r = d["r"]
    if quantity == "volume":
        return 4 / 3 * math.pi * r**3
    return 4 * math.pi * r * r
