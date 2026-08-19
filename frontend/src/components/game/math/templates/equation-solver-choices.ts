/** Choice building for the Equation Solver template (specs/020 US3).
 *
 * A step may author its own wrong options (`distractors`); without them the
 * generic pool below fills in — exactly the pre-020 behaviour. */

export interface SolverChoice {
  label: string;
  id: string;
  correct: boolean;
}

export const GENERIC_DISTRACTORS = [
  "Add 1 to both sides",
  "Multiply both sides by 2",
  "Subtract from left side only",
  "Add to right side only",
  "Multiply left side by x",
  "Divide both sides by x",
  "Square both sides",
  "Take square root of both sides",
];

export function buildSolverChoices(
  step: { id: string; actionLabel: string; distractors?: string[] },
  shuffle: <T>(arr: T[]) => T[] = defaultShuffle
): SolverChoice[] {
  const authored = (step.distractors ?? [])
    .map((d) => d.trim())
    .filter((d, i, arr) => d && d !== step.actionLabel && arr.indexOf(d) === i);

  const wrong =
    authored.length > 0
      ? authored
      : shuffle(GENERIC_DISTRACTORS.filter((d) => d !== step.actionLabel)).slice(0, 2);

  return shuffle([
    { label: step.actionLabel, id: step.id, correct: true },
    ...wrong.map((label, i) => ({ label, id: `d${i + 1}`, correct: false })),
  ]);
}

function defaultShuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}
