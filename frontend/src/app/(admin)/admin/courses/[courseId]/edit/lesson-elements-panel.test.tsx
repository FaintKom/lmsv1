import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { LessonElementsPanel } from "./lesson-elements-panel";

/**
 * Раскрытая строка урока.
 *
 * Главное обещание, ради которого тест написан рендером, а не проверкой
 * функции: названия заданий уходят запросом **при раскрытии**, а не при
 * отрисовке страницы курса. Курс из сорока уроков не должен звонить сорок раз
 * за строками, которые никто не откроет.
 */

const get = vi.fn();

vi.mock("@/lib/api-client", () => ({
  default: {
    get: (...args: unknown[]) => get(...args),
  },
}));

vi.mock("@/lib/i18n/context", () => ({
  useTranslation: () => ({ t: (k: string) => k, locale: "en" }),
}));

const lesson = {
  version: 3,
  pages: [
    {
      id: "page_1",
      blocks: [
        { id: "b1", type: "text", sort_order: 0, page: 1, body: "Что такое цикл" },
        { id: "b2", type: "exercise", sort_order: 1, page: 1, exercise_id: "e1" },
      ],
    },
    {
      id: "page_2",
      blocks: [{ id: "b3", type: "exercise", sort_order: 0, page: 2, exercise_id: "e2" }],
    },
  ],
};

function draw(props: { open: boolean; content?: Record<string, unknown> }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  return render(
    <QueryClientProvider client={client}>
      <LessonElementsPanel
        open={props.open}
        lessonId="l1"
        courseId="c1"
        moduleId="m1"
        content={props.content ?? lesson}
      />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  get.mockReset();
  get.mockResolvedValue({
    data: [
      { id: "e1", title: "Reading a range" },
      { id: "e2", title: "What input() gives you" },
    ],
  });
});

describe("запросы за названиями", () => {
  it("свёрнутая строка не спрашивает ничего", () => {
    draw({ open: false });
    expect(get).not.toHaveBeenCalled();
  });

  it("раскрытие спрашивает задания этого урока — один раз", async () => {
    draw({ open: true });
    await waitFor(() => expect(screen.getByText("Reading a range")).toBeTruthy());
    expect(get).toHaveBeenCalledTimes(1);
    expect(get).toHaveBeenCalledWith("/exercises/by-lesson/l1");
  });

  it("повторное раскрытие берёт уже полученное", async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: Infinity } },
    });
    const panel = (open: boolean) => (
      <QueryClientProvider client={client}>
        <LessonElementsPanel
          open={open}
          lessonId="l1"
          courseId="c1"
          moduleId="m1"
          content={lesson}
        />
      </QueryClientProvider>
    );

    const view = render(panel(true));
    await waitFor(() => expect(screen.getByText("Reading a range")).toBeTruthy());
    view.rerender(panel(false));
    view.rerender(panel(true));
    await waitFor(() => expect(screen.getByText("Reading a range")).toBeTruthy());

    expect(get).toHaveBeenCalledTimes(1);
  });
});

describe("что видно в списке", () => {
  it("элементы разложены по страницам, заголовки есть только у нескольких страниц", async () => {
    draw({ open: true });
    await waitFor(() => expect(screen.getByText("Reading a range")).toBeTruthy());

    expect(screen.getAllByText("admin.courseEdit.elementsPage")).toHaveLength(2);
    expect(screen.getByText("Что такое цикл")).toBeTruthy();
    expect(screen.getByText("What input() gives you")).toBeTruthy();
  });

  it("одна страница — без заголовка страницы", async () => {
    draw({
      open: true,
      content: {
        version: 3,
        pages: [
          {
            id: "page_1",
            blocks: [{ id: "b1", type: "text", sort_order: 0, page: 1, body: "Один" }],
          },
        ],
      },
    });
    await waitFor(() => expect(screen.getByText("Один")).toBeTruthy());
    expect(screen.queryByText("admin.courseEdit.elementsPage")).toBeNull();
  });

  it("пустой урок говорит об этом, а не показывает пустоту", async () => {
    draw({ open: true, content: { version: 3, pages: [{ id: "page_1", blocks: [] }] } });
    await waitFor(() => expect(screen.getByText("admin.courseEdit.elementsEmpty")).toBeTruthy());
  });

  it("пока названия не пришли, строка занимает место и называет тип", async () => {
    let release: (v: unknown) => void = () => {};
    get.mockImplementation(() => new Promise((resolve) => (release = resolve)));

    draw({ open: true });

    expect(screen.getAllByTestId("element-pending")).toHaveLength(2);
    release({ data: [{ id: "e1", title: "Reading a range" }] });
    await waitFor(() => expect(screen.getByText("Reading a range")).toBeTruthy());
  });

  it("ответ пришёл без задания — это потерянная ссылка, а не пустое имя", async () => {
    get.mockResolvedValue({ data: [{ id: "e1", title: "Reading a range" }] });
    draw({ open: true });
    await waitFor(() => expect(screen.getByText("admin.courseEdit.elementMissing")).toBeTruthy());
  });
});
