/**
 * Reading a system of linear equations well enough to draw it.
 *
 * The server is the grader (see `_submit_math_system` in exercises/service.py),
 * so nothing here decides whether a student is right in a live exercise. What
 * it is for is the picture: two equations in x and y are two lines, and the
 * three answers a student can give — one solution, none, infinitely many — are
 * the three ways two lines can sit. Showing that is the point of the topic.
 *
 * Coefficients are read numerically rather than by pattern-matching the text.
 * For a linear f, f(0) is the constant and f(e_j) - f(0) is the coefficient of
 * the j-th variable, which costs one evaluation per variable and works on
 * anything the parser accepts: "2x + 3y = 12", "y = 2x - 1", "4(x - y) = 8".
 */

import { compileMultivariate, ExpressionError } from "@/lib/math/expression";

/** One equation as `coefficients · variables = constant`. */
export interface LinearEquation {
  coefficients: number[];
  constant: number;
}

export type SolutionKind = "unique" | "none" | "infinite";

export interface SystemSolution {
  kind: SolutionKind;
  /** Present only when kind is "unique". */
  values?: Record<string, number>;
}

const EPSILON = 1e-9;

/**
 * Reads one equation into coefficients. Throws ExpressionError if either side
 * fails to parse, and returns null if the equation is not linear — a teacher
 * can type "x^2 + y = 1", and a wrong straight line is worse than no picture.
 */
export function readEquation(equation: string, variables: string[]): LinearEquation | null {
  const sides = equation.split("=");
  if (sides.length !== 2) throw new ExpressionError(`"${equation}" is not an equation`);

  const left = compileMultivariate(sides[0], variables);
  const right = compileMultivariate(sides[1], variables);
  const f = (scope: Record<string, number>) => left(scope) - right(scope);

  const zeros = Object.fromEntries(variables.map((v) => [v, 0]));
  const atZero = f(zeros);
  if (!Number.isFinite(atZero)) return null;

  const coefficients: number[] = [];
  for (const variable of variables) {
    const value = f({ ...zeros, [variable]: 1 });
    if (!Number.isFinite(value)) return null;
    coefficients.push(value - atZero);
  }

  // Linearity check, in two parts, both needed:
  //   f(2e_j) - f(0) = 2(f(e_j) - f(0))   catches powers of one variable
  //   f(p) - f(0) = Σ c_j p_j             catches cross terms
  // Without the first, "x^2 = 4" reads as the line 0·x = 4. Without the
  // second, "x*y = 6" passes every single-variable probe — it is linear in
  // each variable on its own — and reads as 0 = 6.
  for (let j = 0; j < variables.length; j++) {
    const doubled = f({ ...zeros, [variables[j]]: 2 }) - atZero;
    if (!Number.isFinite(doubled)) return null;
    if (Math.abs(doubled - 2 * coefficients[j]) > 1e-6) return null;
  }
  // Distinct multipliers, so no cross term can cancel itself out.
  const probe = Object.fromEntries(variables.map((v, j) => [v, j + 2]));
  const atProbe = f(probe) - atZero;
  const predicted = coefficients.reduce((sum, c, j) => sum + c * (j + 2), 0);
  if (!Number.isFinite(atProbe) || Math.abs(atProbe - predicted) > 1e-6) return null;

  return { coefficients, constant: -atZero };
}

/** Reads every equation, or returns null if any one of them is not linear. */
export function readSystem(equations: string[], variables: string[]): LinearEquation[] | null {
  const rows: LinearEquation[] = [];
  for (const equation of equations) {
    let row: LinearEquation | null;
    try {
      row = readEquation(equation, variables);
    } catch {
      return null;
    }
    if (!row) return null;
    rows.push(row);
  }
  return rows;
}

/**
 * Gaussian elimination with partial pivoting.
 *
 * Used for the two static cases — a lesson step with no server behind it, and
 * the teacher's own preview of what they just typed. A live exercise never
 * reaches this: it posts to the backend, which solves with SymPy.
 */
export function solveSystem(rows: LinearEquation[], variables: string[]): SystemSolution {
  const n = variables.length;
  const matrix = rows.map((r) => [...r.coefficients, r.constant]);
  const pivotOf: number[] = [];

  let row = 0;
  for (let col = 0; col < n && row < matrix.length; col++) {
    let best = row;
    for (let r = row + 1; r < matrix.length; r++) {
      if (Math.abs(matrix[r][col]) > Math.abs(matrix[best][col])) best = r;
    }
    if (Math.abs(matrix[best][col]) < EPSILON) continue;

    [matrix[row], matrix[best]] = [matrix[best], matrix[row]];
    const pivot = matrix[row][col];
    for (let c = col; c <= n; c++) matrix[row][c] /= pivot;
    for (let r = 0; r < matrix.length; r++) {
      if (r === row) continue;
      const factor = matrix[r][col];
      if (Math.abs(factor) < EPSILON) continue;
      for (let c = col; c <= n; c++) matrix[r][c] -= factor * matrix[row][c];
    }
    pivotOf.push(col);
    row++;
  }

  // A row of zero coefficients with a non-zero constant is 0 = 5.
  for (const r of matrix) {
    const allZero = r.slice(0, n).every((v) => Math.abs(v) < EPSILON);
    if (allZero && Math.abs(r[n]) > EPSILON) return { kind: "none" };
  }
  if (pivotOf.length < n) return { kind: "infinite" };

  const values: Record<string, number> = {};
  pivotOf.forEach((col, i) => {
    // -0 stringifies as "-0", which reads as a different answer to a student.
    values[variables[col]] = matrix[i][n] + 0;
  });
  return { kind: "unique", values };
}
