import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ExercisePreview } from "./exercise-preview";
import { V2_LIVE_TYPES } from "@/lib/exercises/v2-adapter";

// The two renderers are heavy (Monaco, Three.js, Blockly). The decision is
// what this file guards, so both are stubbed down to a marker.
vi.mock("@/components/exercises/v2-exercise-live", () => ({
  V2ExerciseLive: ({ previewMode }: { previewMode?: boolean }) => (
    <div data-testid="v2" data-preview={String(!!previewMode)} />
  ),
}));
vi.mock("@/components/exercises/exercise-renderer", () => ({
  default: ({ previewMode }: { previewMode?: boolean }) => (
    <div data-testid="legacy" data-preview={String(!!previewMode)} />
  ),
}));

describe("ExercisePreview", () => {
  it.each(V2_LIVE_TYPES)("gives %s its live widget, not the legacy renderer", (type) => {
    const { unmount } = render(<ExercisePreview exercise={{ exercise_type: type }} />);
    expect(screen.getByTestId("v2")).toBeTruthy();
    expect(screen.queryByTestId("legacy")).toBeNull();
    unmount();
  });

  it("falls back to the legacy renderer for a type with no v2 widget", () => {
    render(<ExercisePreview exercise={{ exercise_type: "math_interactive" }} />);
    expect(screen.getByTestId("legacy")).toBeTruthy();
    expect(screen.queryByTestId("v2")).toBeNull();
  });

  it("always previews — no attempt is spent on either path", () => {
    const { unmount } = render(<ExercisePreview exercise={{ exercise_type: "matching" }} />);
    expect(screen.getByTestId("v2").dataset.preview).toBe("true");
    unmount();
    render(<ExercisePreview exercise={{ exercise_type: "math_interactive" }} />);
    expect(screen.getByTestId("legacy").dataset.preview).toBe("true");
  });
});
