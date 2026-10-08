import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import WebEditorExercise from "./web-editor-exercise";

/**
 * specs/095: превью веб-редактора исполняет чужой код.
 *
 * В превью попадают `starter_*` из конфига — их пишет автор задания, а
 * открывает ученик или админ в библиотеке контента. С `allow-same-origin`
 * этот код жил на origin LMS: ходил в `/api/v1/*` с сессией смотрящего,
 * читал localStorage и мог снять sandbox со своего же фрейма. Тест падает,
 * если в sandbox вернётся что-нибудь кроме `allow-scripts`.
 */

vi.mock("@/lib/api-client", () => ({ default: { post: vi.fn(), get: vi.fn() } }));
vi.mock("@/lib/i18n/context", () => ({
  useTranslation: () => ({ t: (k: string) => k, locale: "en" }),
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock("@monaco-editor/react", () => ({ default: () => null }));

function renderEditor() {
  render(
    <WebEditorExercise
      exerciseId="ex-1"
      config={{
        starter_html: "<p id='hi'>hello</p>",
        starter_css: "p { color: teal; }",
        starter_js: "document.getElementById('hi').textContent = 'ran';",
      }}
      onSubmit={() => {}}
    />,
  );
  return screen.getByTitle("we.livePreview") as HTMLIFrameElement;
}

describe("WebEditorExercise preview sandbox", () => {
  it("runs scripts in an opaque origin: allow-scripts and nothing else", () => {
    const frame = renderEditor();
    const tokens = (frame.getAttribute("sandbox") ?? "").split(/\s+/).filter(Boolean);
    expect(frame.hasAttribute("sandbox")).toBe(true);
    expect(tokens).toEqual(["allow-scripts"]);
    expect(tokens).not.toContain("allow-same-origin");
  });

  it("still gets the author's HTML, CSS and JS inline", () => {
    const doc = renderEditor().getAttribute("srcdoc") ?? "";
    expect(doc).toContain("<p id='hi'>hello</p>");
    expect(doc).toContain("p { color: teal; }");
    expect(doc).toContain("textContent = 'ran'");
  });
});
