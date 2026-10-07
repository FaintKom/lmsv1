import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";

import { AskWidget } from "./ask-widget";

vi.mock("@/lib/i18n/context", () => ({
  useTranslation: () => ({ t: (k: string) => k, locale: "en" }),
}));

let resolvePost: (value: { data: { answer: string } }) => void = () => {};
vi.mock("@/lib/api-client", () => ({
  default: {
    post: () => new Promise((resolve) => (resolvePost = resolve)),
  },
}));

describe("AskWidget", () => {
  it("shows a moving indicator while the answer is pending, and drops it after", async () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <AskWidget lessonId="l1" />
      </QueryClientProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "tutor.ask" }));
    fireEvent.change(screen.getByPlaceholderText("tutor.placeholder"), {
      target: { value: "why?" },
    });
    fireEvent.click(screen.getByRole("button", { name: "tutor.send" }));

    const status = await screen.findByRole("status");
    expect(status).toHaveTextContent("tutor.thinking");
    expect(status.querySelectorAll(".motion-safe\\:animate-pulse")).toHaveLength(3);

    resolvePost({ data: { answer: "because" } });
    expect(await screen.findByText("because")).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
