import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

import { MathSystemV2 } from "./math-system-v2";

vi.mock("@/lib/i18n/context", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

/** The shell is chrome — hearts, streak, the Check button. Only the button
 *  matters here, so it is reduced to one that reports whether it is enabled. */
vi.mock("@/components/lesson/lesson-shell", () => ({
  useConfetti: () => ({ fire: vi.fn(), layer: null }),
  LessonShell: ({
    children,
    canCheck,
    onCheck,
    feedback,
  }: {
    children: React.ReactNode;
    canCheck: boolean;
    onCheck: () => void;
    feedback: { kind: string; msg: string } | null;
  }) => (
    <div>
      {children}
      <button type="button" disabled={!canCheck} onClick={onCheck}>
        check
      </button>
      {feedback && <p data-testid="feedback">{feedback.kind}</p>}
    </div>
  ),
}));

vi.mock("@/components/common/math-renderer", () => ({
  MaybeMath: ({ text }: { text: string }) => <span>{text}</span>,
}));

const CROSSING = ["x + y = 5", "x - y = 1"];

describe("MathSystemV2", () => {
  it("will not let a student check before choosing what kind of answer it is", () => {
    render(<MathSystemV2 equations={CROSSING} />);
    expect(screen.getByRole("button", { name: "check" })).toBeDisabled();
  });

  it("asks for a value per variable only under one solution", () => {
    render(<MathSystemV2 equations={CROSSING} />);

    fireEvent.click(screen.getByRole("radio", { name: "exercise.mathSystem.kindNone" }));
    expect(screen.queryAllByRole("textbox")).toHaveLength(0);
    expect(screen.getByRole("button", { name: "check" })).toBeEnabled();

    fireEvent.click(screen.getByRole("radio", { name: "exercise.mathSystem.kindUnique" }));
    // Boxes appeared and are empty, so there is nothing to check yet.
    expect(screen.getByRole("button", { name: "check" })).toBeDisabled();
    expect(screen.getAllByRole("textbox")).toHaveLength(2);
  });

  it("hands the server the shape and the values, not a rendered string", async () => {
    const onGrade = vi.fn().mockResolvedValue({ correct: true });
    render(<MathSystemV2 equations={CROSSING} onGrade={onGrade} />);

    fireEvent.click(screen.getByRole("radio", { name: "exercise.mathSystem.kindUnique" }));
    const [x, y] = screen.getAllByRole("textbox");
    fireEvent.change(x, { target: { value: "3" } });
    fireEvent.change(y, { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: "check" }));

    await waitFor(() =>
      expect(onGrade).toHaveBeenCalledWith({ kind: "unique", values: { x: 3, y: 2 } }),
    );
    await waitFor(() => expect(screen.getByTestId("feedback")).toHaveTextContent("ok"));
  });

  it("marks locally when no server is attached", async () => {
    render(<MathSystemV2 equations={["x + y = 1", "2x + 2y = 5"]} />);

    fireEvent.click(screen.getByRole("radio", { name: "exercise.mathSystem.kindNone" }));
    fireEvent.click(screen.getByRole("button", { name: "check" }));
    await waitFor(() => expect(screen.getByTestId("feedback")).toHaveTextContent("ok"));
  });

  it("draws one line per equation when there are two variables", () => {
    const { container } = render(<MathSystemV2 equations={CROSSING} />);
    expect(container.querySelectorAll("svg line[stroke^='var(--viz']")).toHaveLength(2);
  });

  it("draws nothing for three variables rather than a misleading picture", () => {
    const { container } = render(
      <MathSystemV2
        equations={["x + y + z = 6", "x - y = -1", "z - y = 1"]}
        variables={["x", "y", "z"]}
      />,
    );
    expect(container.querySelector("svg")).toBeNull();
  });
});
