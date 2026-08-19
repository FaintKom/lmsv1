import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { V2ExerciseLive } from "./v2-exercise-live";

/**
 * Finding 5, asked of the V2 path (spec 005, T013): the lesson page renders
 * every V2 type through this wrapper, and the wrapper used to read only the
 * attempt counters from /attempts — a pupil who solved an exercise came back
 * to a pristine board with no score, no state, nothing. The renderer path was
 * fixed in #319; this is the same promise made by the other door.
 */

const get = vi.fn();
vi.mock("@/lib/api-client", () => ({
  default: { get: (...a: unknown[]) => get(...a), post: vi.fn() },
}));
vi.mock("@/lib/i18n/context", () => ({
  useTranslation: () => ({ t: (k: string) => k, locale: "en" }),
}));

const exercise = {
  id: "ex-1",
  exercise_type: "true_false",
  config: { statement: "The sky is green." },
};

function attempts(body: Record<string, unknown>) {
  get.mockResolvedValue({ data: body });
}

beforeEach(() => get.mockReset());

describe("V2ExerciseLive restore", () => {
  it("shows the solved state instead of a pristine board", async () => {
    attempts({
      attempt_count: 1,
      max_attempts: 100,
      max_reached: false,
      last_submission: { score: 100, passed: true, status: "graded" },
    });
    render(<V2ExerciseLive exercise={exercise} />);
    expect(await screen.findByText("exercise.restored.passed")).toBeTruthy();
    expect(screen.getByText(/exercise\.restored\.score/)).toBeTruthy();
    // the game itself stays unmounted until the pupil asks for it
    expect(screen.queryByText(/The sky is green/)).toBeNull();
  });

  it("offers retry, and retry mounts the exercise", async () => {
    attempts({
      attempt_count: 1,
      max_attempts: 100,
      max_reached: false,
      last_submission: { score: 0, passed: false, status: "graded" },
    });
    render(<V2ExerciseLive exercise={exercise} />);
    expect(await screen.findByText("exercise.restored.notPassed")).toBeTruthy();
    fireEvent.click(screen.getByText("exercise.restored.retry"));
    await waitFor(() => expect(screen.getByText(/The sky is green/)).toBeTruthy());
  });

  it("withholds retry once attempts are exhausted", async () => {
    attempts({
      attempt_count: 2,
      max_attempts: 2,
      max_reached: true,
      last_submission: { score: 0, passed: false, status: "graded" },
    });
    render(<V2ExerciseLive exercise={exercise} />);
    expect(await screen.findByText("exercise.restored.exhausted")).toBeTruthy();
    expect(screen.queryByText("exercise.restored.retry")).toBeNull();
  });

  it("renders the exercise untouched when nothing was submitted", async () => {
    attempts({ attempt_count: 0, max_attempts: 100, max_reached: false });
    render(<V2ExerciseLive exercise={exercise} />);
    await waitFor(() => expect(screen.getByText(/The sky is green/)).toBeTruthy());
    expect(screen.queryByText("exercise.restored.passed")).toBeNull();
  });
});
