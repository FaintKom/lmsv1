/**
 * Volume and area of the solids the stereometry exercise asks about.
 *
 * The server is the grader — `app/math_validation/solids.py` holds the same
 * five formulas and is what a live submission is marked against. This copy
 * exists for the two places there is no server in the loop: the teacher's
 * preview, which has to show the number their exercise will mark as correct
 * before they publish it, and a static lesson step.
 *
 * Keeping the two in step matters, so they are written here in the same order
 * and with the same names as in the Python.
 */

export const SOLIDS = {
  /** Rectangular box: edges a, b, c. */
  box: ["a", "b", "c"],
  /** Right pyramid on a square base: base edge a, height h. */
  pyramid: ["a", "h"],
  cylinder: ["r", "h"],
  cone: ["r", "h"],
  sphere: ["r"],
} as const;

export type Solid = keyof typeof SOLIDS;
export type Quantity = "volume" | "surface_area" | "lateral_area";

export const QUANTITIES: Quantity[] = ["volume", "surface_area", "lateral_area"];

export const SOLID_NAMES = Object.keys(SOLIDS) as Solid[];

export function isSolid(value: unknown): value is Solid {
  return typeof value === "string" && value in SOLIDS;
}

export function isQuantity(value: unknown): value is Quantity {
  return QUANTITIES.includes(value as Quantity);
}

/** The measurements this solid needs, in the order a teacher would give them. */
export function dimensionsFor(solid: Solid): readonly string[] {
  return SOLIDS[solid];
}

/**
 * The exact value, or null if the solid, quantity or measurements cannot
 * produce one. Null rather than a throw: this runs on every keystroke in the
 * config editor, where a half-typed number is normal rather than exceptional.
 */
export function computeSolid(
  solid: string,
  dimensions: Record<string, unknown>,
  quantity: string,
): number | null {
  if (!isSolid(solid) || !isQuantity(quantity)) return null;

  const d: Record<string, number> = {};
  for (const name of SOLIDS[solid]) {
    const raw = dimensions?.[name];
    const value = typeof raw === "string" ? parseFloat(raw) : raw;
    if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return null;
    d[name] = value;
  }

  switch (solid) {
    case "box": {
      const { a, b, c } = d;
      if (quantity === "volume") return a * b * c;
      const lateral = 2 * c * (a + b);
      return quantity === "lateral_area" ? lateral : lateral + 2 * a * b;
    }
    case "pyramid": {
      const { a, h } = d;
      if (quantity === "volume") return (a * a * h) / 3;
      // Slant height to the middle of a base edge, not to a corner.
      const apothem = Math.hypot(h, a / 2);
      const lateral = 2 * a * apothem;
      return quantity === "lateral_area" ? lateral : lateral + a * a;
    }
    case "cylinder": {
      const { r, h } = d;
      if (quantity === "volume") return Math.PI * r * r * h;
      const lateral = 2 * Math.PI * r * h;
      return quantity === "lateral_area" ? lateral : lateral + 2 * Math.PI * r * r;
    }
    case "cone": {
      const { r, h } = d;
      if (quantity === "volume") return (Math.PI * r * r * h) / 3;
      const slant = Math.hypot(r, h);
      const lateral = Math.PI * r * slant;
      return quantity === "lateral_area" ? lateral : lateral + Math.PI * r * r;
    }
    case "sphere": {
      const { r } = d;
      // A sphere has no base to leave out, so lateral is the whole surface.
      if (quantity === "volume") return (4 / 3) * Math.PI * r ** 3;
      return 4 * Math.PI * r * r;
    }
  }
}

/** Decimal places the answer is asked to. Mirrors `_stereometry_places`. */
export function placesFor(decimals: unknown): number {
  if (typeof decimals !== "number" || !Number.isInteger(decimals)) return 2;
  return Math.max(0, Math.min(6, decimals));
}

/** Rounded to the asked places — what a student is expected to type. */
export function roundTo(value: number, places: number): number {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}
