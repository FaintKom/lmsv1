/**
 * The equation inside a problem written for a human.
 *
 * The Step-by-Step editor keeps one field for both jobs: the student reads it
 * as the problem, and the generator parses it as an equation. The field's own
 * placeholder offered `Solve for x: x^2 - 5x + 6 = 0`, and a teacher who
 * typed exactly that got «Step generation failed (check expression syntax)» —
 * SymPy was handed the sentence, words and all.
 *
 * The lead-in is dropped only when what follows still looks like an equation,
 * so a problem that merely contains a colon is left alone.
 */
export function equationOf(problem: string): string {
  const colon = problem.indexOf(":");
  if (colon === -1) return problem.trim();
  const tail = problem.slice(colon + 1).trim();
  return tail.includes("=") ? tail : problem.trim();
}
