import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { LivePreview } from "./live-preview";

/**
 * specs/041: превью спрашивает сервер про то задание, которое редактируется.
 *
 * Оно собирало задание из полей формы и номер туда не клало, поэтому
 * проверка уходила на `/exercises/undefined/check` и возвращала 422. В проде
 * это выглядело как «кнопка не нажалась»: вердикта нет, ошибки нет.
 */

const post = vi.fn();
const get = vi.fn();
vi.mock("@/lib/api-client", () => ({
  default: {
    get: (...a: unknown[]) => get(...a),
    post: (...a: unknown[]) => post(...a),
  },
}));
vi.mock("@/lib/i18n/context", () => ({
  useTranslation: () => ({ t: (k: string) => k, locale: "en" }),
}));

const info = vi.fn();
vi.mock("sonner", () => ({ toast: { info: (...a: unknown[]) => info(...a) } }));

const CONFIG = { statement: "Water is wet", correct_answer: true };

function renderPreview() {
  render(
    <LivePreview exerciseType="true_false" config={CONFIG} title="Wetness" exerciseId="ex-42" />,
  );
  fireEvent.click(screen.getByText("exercise.trueFalse.true"));
  fireEvent.click(screen.getByText("exercise.check"));
}

beforeEach(() => {
  post.mockReset();
  get.mockReset();
  info.mockReset();
});

describe("LivePreview", () => {
  it("проверяет ответ по номеру задания, а не по undefined", async () => {
    post.mockResolvedValue({ data: { passed: true } });

    renderPreview();

    await waitFor(() => expect(post).toHaveBeenCalled());
    expect(post.mock.calls[0][0]).toBe("/exercises/ex-42/check");
  });

  it("отказ проверки называет себя, а не выдаёт вердикт", async () => {
    post.mockRejectedValue(new Error("422"));

    renderPreview();

    await waitFor(() =>
      expect(info).toHaveBeenCalledWith("admin.exercisePreview.verdictUnavailable"),
    );
    // Ни «верно», ни «неверно» — вердикта не было.
    expect(screen.queryByText("exercise.correct")).toBeNull();
  });
});
