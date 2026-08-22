import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

const addExerciseToPage = vi.fn();
const placeExistingInPage = vi.fn();
const libraryList = vi.fn();

vi.mock("@/lib/lessons/add-exercise", () => ({
  addExerciseToPage: (...args: unknown[]) => addExerciseToPage(...args),
  placeExistingInPage: (...args: unknown[]) => placeExistingInPage(...args),
}));

vi.mock("@/lib/api/exercises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/exercises")>();
  return { ...actual, exercisesApi: { ...actual.exercisesApi, list: (...args: unknown[]) => libraryList(...args) } };
});

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
  addExerciseToPage.mockReset();
  addExerciseToPage.mockResolvedValue({ exerciseId: "e9" });
  placeExistingInPage.mockReset();
  placeExistingInPage.mockResolvedValue(undefined);
  libraryList.mockReset();
  libraryList.mockResolvedValue({
    data: { items: [{ id: "lib-1", display_id: "QZ-0001", title: "Фотосинтез", is_placed: false }], total: 1 },
  });
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

  it("каждый элемент — ссылка, открывающаяся отдельной вкладкой", async () => {
    draw({ open: true });
    await waitFor(() => expect(screen.getByText("Reading a range")).toBeTruthy());

    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(3);
    for (const link of links) {
      expect(link.getAttribute("target")).toBe("_blank");
      expect(link.getAttribute("rel")).toContain("noopener");
    }
    expect(links[1].getAttribute("href")).toBe("/admin/content-library/e1");
    expect(links[0].getAttribute("href")).toBe(
      "/admin/lessons/l1/edit?courseId=c1&moduleId=m1&block=b1",
    );
  });

  it("ответ пришёл без задания — это потерянная ссылка, а не пустое имя", async () => {
    get.mockResolvedValue({ data: [{ id: "e1", title: "Reading a range" }] });
    draw({ open: true });
    await waitFor(() => expect(screen.getByText("admin.courseEdit.elementMissing")).toBeTruthy());
  });
});

describe("клавиатура и переходы", () => {
  it("Escape сворачивает список", async () => {
    const onClose = vi.fn();
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <LessonElementsPanel
          open
          lessonId="l1"
          courseId="c1"
          moduleId="m1"
          content={lesson}
          onClose={onClose}
        />
      </QueryClientProvider>,
    );
    await waitFor(() => expect(screen.getByText("Reading a range")).toBeTruthy());

    fireEvent.keyDown(screen.getByText("Reading a range"), { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("клик внутри списка не всплывает до строки урока", async () => {
    const onRowClick = vi.fn();
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <div onClick={onRowClick}>
          <LessonElementsPanel open lessonId="l1" courseId="c1" moduleId="m1" content={lesson} />
        </div>
      </QueryClientProvider>,
    );
    await waitFor(() => expect(screen.getByText("Reading a range")).toBeTruthy());

    fireEvent.click(screen.getAllByText("admin.courseEdit.elementsAdd")[0]);
    expect(onRowClick).not.toHaveBeenCalled();
  });
});

describe("добавление задания", () => {
  const openMenu = async (pageIndex = 0) => {
    draw({ open: true });
    await waitFor(() => expect(screen.getByText("Reading a range")).toBeTruthy());
    fireEvent.click(screen.getAllByText("admin.courseEdit.elementsAdd")[pageIndex]);
  };

  it("кнопка добавления стоит у каждой страницы урока", async () => {
    draw({ open: true });
    await waitFor(() => expect(screen.getByText("Reading a range")).toBeTruthy());
    expect(screen.getAllByText("admin.courseEdit.elementsAdd")).toHaveLength(2);
  });

  it("типы разложены по группам", async () => {
    await openMenu();
    for (const group of ["basic", "math", "languages", "programming", "scorm"]) {
      expect(screen.getByText(`exerciseGroups.${group}`)).toBeTruthy();
    }
    expect(screen.getByText("Fill Blanks")).toBeTruthy();
  });

  it("поиск сужает список до нужного типа", async () => {
    await openMenu();
    fireEvent.change(screen.getByPlaceholderText("admin.courseEdit.elementsSearch"), {
      target: { value: "cross" },
    });
    expect(screen.getByText("Crossword")).toBeTruthy();
    expect(screen.queryByText("Fill Blanks")).toBeNull();
    expect(screen.queryByText("exerciseGroups.math")).toBeNull();
  });

  it("выбор типа заводит задание на своей странице", async () => {
    await openMenu(1);
    fireEvent.click(screen.getByText("Quiz"));

    await waitFor(() => expect(addExerciseToPage).toHaveBeenCalledTimes(1));
    expect(addExerciseToPage.mock.calls[0][0]).toMatchObject({
      pageIndex: 1,
      exerciseType: "quiz",
      where: { lessonId: "l1", courseId: "c1", moduleId: "m1" },
    });
  });

  it("отказ виден, и список остаётся прежним", async () => {
    addExerciseToPage.mockRejectedValue(new Error("no"));
    await openMenu();
    fireEvent.click(screen.getByText("Quiz"));

    await waitFor(() => expect(screen.getByText("admin.courseEdit.elementsAddFailed")).toBeTruthy());
    expect(screen.getByText("Reading a range")).toBeTruthy();
  });
});

describe("вставить из библиотеки", () => {
  const openExisting = async (pageIndex = 0) => {
    draw({ open: true });
    await waitFor(() => expect(screen.getByText("Reading a range")).toBeTruthy());
    fireEvent.click(screen.getAllByText("admin.courseEdit.elementsAdd")[pageIndex]);
    fireEvent.click(screen.getByText("admin.courseEdit.elementsExisting"));
  };

  it("пустая строка ничего не ищет — библиотека не для листания из меню", async () => {
    await openExisting();
    expect(screen.getByText("admin.courseEdit.elementsTypeToSearch")).toBeTruthy();
    expect(libraryList).not.toHaveBeenCalled();
  });

  it("от двух букв идёт поиск, и найденное можно поставить на свою страницу", async () => {
    await openExisting(1);
    fireEvent.change(screen.getByPlaceholderText("admin.courseEdit.elementsSearch"), {
      target: { value: "фо" },
    });
    await waitFor(() => expect(screen.getByText("Фотосинтез")).toBeTruthy());
    expect(libraryList).toHaveBeenCalledWith(expect.objectContaining({ search: "фо" }));
    expect(screen.getByText("admin.contentLibrary.unplaced")).toBeTruthy();

    fireEvent.click(screen.getByText("Фотосинтез"));
    await waitFor(() => expect(placeExistingInPage).toHaveBeenCalledTimes(1));
    expect(placeExistingInPage.mock.calls[0][0]).toMatchObject({ pageIndex: 1, exerciseId: "lib-1" });
    expect(addExerciseToPage).not.toHaveBeenCalled();
  });

  it("ничего не нашлось — так и сказано", async () => {
    libraryList.mockResolvedValue({ data: { items: [], total: 0 } });
    await openExisting();
    fireEvent.change(screen.getByPlaceholderText("admin.courseEdit.elementsSearch"), {
      target: { value: "zzzz" },
    });
    await waitFor(() => expect(screen.getByText("admin.courseEdit.elementsNothingFound")).toBeTruthy());
  });
});
