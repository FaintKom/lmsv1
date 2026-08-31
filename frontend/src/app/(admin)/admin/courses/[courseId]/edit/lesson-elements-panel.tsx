"use client";

/**
 * Раскрытая строка урока: из чего он состоит.
 *
 * Состав берётся из содержимого, которое уже приехало вместе с курсом, —
 * рисовать список не стоит ни одного запроса. Запрос стоит только имя: у
 * блока-задания в содержимом лежит идентификатор, а не название.
 *
 * Отсюда `enabled: open`. Курс из сорока уроков, спрашивающий названия для
 * всех сразу, — сорок запросов ради строк, которые никто не открыл; это
 * записано отдельным требованием и проверяется тестом, считающим вызовы.
 */

import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardList, Code2, FileText, Plus, Presentation, Puzzle, Video } from "lucide-react";
import { useState } from "react";

import apiClient from "@/lib/api-client";
import { EXERCISE_TYPES_META, exercisesApi, type ExerciseGroupKey } from "@/lib/api/exercises";
import { useTranslation } from "@/lib/i18n/context";
import { addExerciseToPage, placeExistingInPage } from "@/lib/lessons/add-exercise";

import {
  elementHref,
  lessonElements,
  resolveName,
  type ElementName,
  type ElementNames,
  type LessonElement,
} from "./lesson-elements";
import type { BlockKind } from "./lesson-summary";

interface LessonElementsPanelProps {
  open: boolean;
  lessonId: string;
  courseId: string;
  moduleId: string;
  content: Record<string, unknown> | undefined;
  /** Свернуть по Escape — фокус при этом возвращает вызывающая сторона. */
  onClose?: () => void;
  /**
   * Содержимое урока изменилось — пусть страница перечитает курс. `content`
   * приходит пропсом из состояния страницы; обновление маршрута его не
   * трогало, и после постановки учитель видел старый список до перезагрузки.
   */
  onChanged?: () => void;
}

/** Порядок групп в меню — от того, что заводят чаще, к узкому. */
const GROUP_ORDER: ExerciseGroupKey[] = ["basic", "math", "languages", "programming", "scorm"];

const ICONS: Record<BlockKind, typeof FileText> = {
  text: FileText,
  html: Code2,
  video: Video,
  presentation: Presentation,
  exercise: Puzzle,
  assignment: ClipboardList,
};

export function LessonElementsPanel({
  open,
  lessonId,
  courseId,
  moduleId,
  content,
  onClose,
  onChanged,
}: LessonElementsPanelProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const pages = lessonElements(content);

  const assignmentIds = [
    ...new Set(
      pages.flatMap((p) => p.elements.map((e) => e.assignmentId).filter(Boolean) as string[]),
    ),
  ];

  const exercises = useQuery({
    queryKey: ["lesson-exercise-names", lessonId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/exercises/by-lesson/${lessonId}`);
      return (data ?? []) as { id: string; title: string }[];
    },
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });

  // Работ в уроке единицы, а список `/assignments` отдаёт учителю только его
  // собственные — чужая работа осталась бы без имени. Поэтому поштучно.
  const assignments = useQueries({
    queries: assignmentIds.map((id) => ({
      queryKey: ["assignment-name", id],
      queryFn: async () => {
        const { data } = await apiClient.get(`/assignments/${id}`);
        return data as { id: string; title: string };
      },
      enabled: open,
      staleTime: 5 * 60 * 1000,
    })),
  });

  const add = async (pageIndex: number, exerciseType: string) => {
    setBusy(true);
    setFailed(false);
    try {
      await addExerciseToPage({
        client: apiClient,
        where: { lessonId, courseId, moduleId },
        content,
        pageIndex,
        exerciseType,
      });
      // Название нового задания приходит тем же запросом, что и остальные, —
      // список обновляется целиком, а не дописывается по месту.
      await queryClient.invalidateQueries({ queryKey: ["lesson-exercise-names", lessonId] });
      onChanged?.();
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  // Тот же путь, что у создания, но без первого шага: задание уже есть, его
  // только ставят. Список имён обновляется целиком — новое имя придёт тем же
  // запросом, что и остальные.
  const place = async (pageIndex: number, exerciseId: string) => {
    setBusy(true);
    setFailed(false);
    try {
      await placeExistingInPage({
        client: apiClient,
        where: { lessonId, courseId, moduleId },
        content,
        pageIndex,
        exerciseId,
      });
      await queryClient.invalidateQueries({ queryKey: ["lesson-exercise-names", lessonId] });
      onChanged?.();
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  const names: ElementNames | null = exercises.isSuccess
    ? {
        exercises: Object.fromEntries((exercises.data ?? []).map((e) => [e.id, e.title])),
        assignments: Object.fromEntries(
          assignments
            .map((q) => q.data)
            .filter((a): a is { id: string; title: string } => !!a)
            .map((a) => [a.id, a.title]),
        ),
      }
    : null;

  const empty = pages.every((p) => p.elements.length === 0);
  const showPageTitles = pages.length > 1;

  return (
    <div
      className="mt-2 rounded-lg border border-border bg-surface-2 px-3 py-2"
      onKeyDown={(e) => {
        if (e.key !== "Escape" || !onClose) return;
        e.stopPropagation();
        onClose();
      }}
    >
      {empty ? (
        <p className="py-1 text-xs text-text-muted">{t("admin.courseEdit.elementsEmpty")}</p>
      ) : (
        pages.map((page) => (
          <div key={page.index} className="py-1">
            {showPageTitles && (
              <p className="mb-1 text-2xs font-medium uppercase tracking-wide text-text-subtle">
                {t("admin.courseEdit.elementsPage").replace("{n}", String(page.index + 1))}
              </p>
            )}
            <ul className="space-y-0.5">
              {page.elements.map((element) => (
                <li key={element.blockId}>
                  <ElementRow
                    element={element}
                    name={resolveName(element, names)}
                    href={elementHref(element, { lessonId, courseId, moduleId })}
                  />
                </li>
              ))}
            </ul>
            <AddExercise
              pageIndex={page.index}
              busy={busy}
              onPick={(type) => add(page.index, type)}
              onPlace={(id) => place(page.index, id)}
            />
          </div>
        ))
      )}
      {empty && <AddExercise pageIndex={0} busy={busy} onPick={(type) => add(0, type)} onPlace={(id) => place(0, id)} />}
      {failed && <p className="pt-1 text-xs text-danger-fg">{t("admin.courseEdit.elementsAddFailed")}</p>}
    </div>
  );
}

/**
 * Выбор типа задания.
 *
 * Двадцать шесть типов — это список, в котором ищут, а не разглядывают, поэтому
 * поиск и группы. Вторая вкладка — «из библиотеки» — ставит задание, которое
 * школа уже завела (specs/030): тем же поиском, по названию и номеру.
 */
function AddExercise({
  pageIndex,
  busy,
  onPick,
  onPlace,
}: {
  pageIndex: number;
  busy: boolean;
  onPick: (type: string) => void;
  onPlace: (exerciseId: string) => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  // «Новое» — 27 типов; «Из библиотеки» — то, что школа уже завела. Второй
  // режим и есть библиотека (specs/030): задание из одного курса ставится в
  // другой, не создаваясь заново.
  const [mode, setMode] = useState<"new" | "existing">("new");

  const needle = query.trim().toLowerCase();
  const matching = EXERCISE_TYPES_META.filter(
    (type) => !needle || type.label.toLowerCase().includes(needle),
  );

  return (
    <div className="pt-1">
      <button
        type="button"
        disabled={busy}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="flex items-center gap-1 rounded px-1 py-1 text-xs font-medium text-primary hover:bg-primary-soft/40 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <Plus className="h-3 w-3" />
        {t("admin.courseEdit.elementsAdd")}
      </button>

      {open && (
        <div
          className="mt-1 rounded-lg border border-border-strong bg-surface p-2"
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="text"
            value={query}
            autoFocus
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("admin.courseEdit.elementsSearch")}
            className="mb-2 w-full rounded border border-border-strong bg-surface px-2 py-1 text-xs text-text outline-none focus:border-primary"
          />
          <div className="mb-2 flex gap-1" role="tablist">
            {(["new", "existing"] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={mode === m}
                onClick={() => setMode(m)}
                className={`rounded px-2 py-0.5 text-2xs font-medium ${
                  mode === m ? "bg-primary-soft text-text" : "text-text-muted hover:bg-surface-2"
                }`}
              >
                {t(m === "new" ? "admin.courseEdit.elementsNew" : "admin.courseEdit.elementsExisting")}
              </button>
            ))}
          </div>
          {mode === "existing" ? (
            <ExistingPicker query={needle} onPlace={onPlace} />
          ) : (
          <div className="max-h-64 overflow-y-auto">
            {GROUP_ORDER.map((group) => {
              const types = matching.filter((type) => type.group === group);
              if (types.length === 0) return null;
              return (
                <div key={group} className="mb-1.5">
                  <p className="mb-0.5 text-2xs font-medium uppercase tracking-wide text-text-subtle">
                    {t(`exerciseGroups.${group}`)}
                  </p>
                  <ul>
                    {types.map((type) => (
                      <li key={type.value}>
                        <button
                          type="button"
                          data-page={pageIndex}
                          onClick={() => {
                            setOpen(false);
                            setQuery("");
                            onPick(type.value);
                          }}
                          className="flex w-full items-center gap-2 rounded px-1.5 py-1 text-left text-xs text-text hover:bg-surface-2"
                        >
                          <type.Icon className="h-3 w-3 shrink-0 text-text-subtle" aria-hidden />
                          {type.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Поиск по библиотеке школы.
 *
 * Запрос уходит только когда есть что искать: пустая строка — это не «покажи
 * всё», библиотека на полторы сотни заданий не для листания из выпадающего
 * меню. Чужая школа здесь невозможна — список фильтруется по организации
 * читателя на сервере, и это проверено тестом.
 */
function ExistingPicker({ query, onPlace }: { query: string; onPlace: (id: string) => void }) {
  const { t } = useTranslation();
  const results = useQuery({
    queryKey: ["library-search", query],
    queryFn: async () => {
      const { data } = await exercisesApi.list({ search: query, per_page: 20 });
      return data.items;
    },
    enabled: query.length >= 2,
    staleTime: 30 * 1000,
  });

  if (query.length < 2) {
    return <p className="px-1 py-2 text-xs text-text-muted">{t("admin.courseEdit.elementsTypeToSearch")}</p>;
  }
  if (results.isPending) {
    return <p className="px-1 py-2 text-xs text-text-subtle">…</p>;
  }
  if (!results.data?.length) {
    return <p className="px-1 py-2 text-xs text-text-muted">{t("admin.courseEdit.elementsNothingFound")}</p>;
  }
  return (
    <ul className="max-h-64 overflow-y-auto">
      {results.data.map((ex) => (
        <li key={ex.id}>
          <button
            type="button"
            onClick={() => onPlace(ex.id)}
            className="flex w-full items-center gap-2 rounded px-1.5 py-1 text-left text-xs text-text hover:bg-surface-2"
          >
            <span className="shrink-0 rounded bg-surface-2 px-1.5 font-mono text-2xs text-text-muted">{ex.display_id}</span>
            <span className="truncate">{ex.title}</span>
            {ex.is_placed === false && (
              <span className="ml-auto shrink-0 text-2xs text-text-subtle">{t("admin.contentLibrary.unplaced")}</span>
            )}
          </button>
        </li>
      ))}
    </ul>
  );
}

/**
 * Строка элемента — ссылка на его правку.
 *
 * Новая вкладка нарочно: страница курса остаётся раскрытой там, где её
 * оставили, и следующий элемент открывается оттуда же, а не после двух
 * возвратов назад.
 */
function ElementRow({
  element,
  name,
  href,
}: {
  element: LessonElement;
  name: ElementName;
  href: string;
}) {
  const { t } = useTranslation();
  const Icon = ICONS[element.type] ?? FileText;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener"
      onClick={(e) => e.stopPropagation()}
      className="flex items-center gap-2 rounded px-1 py-1 text-sm hover:bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      <Icon className="h-3.5 w-3.5 shrink-0 text-text-subtle" aria-hidden />
      <ElementLabel name={name} type={element.type} t={t} />
    </a>
  );
}

/**
 * Имя одной строкой.
 *
 * Ждущее имя занимает ту же высоту, что и пришедшее: иначе список прыгает,
 * когда ответ доходит, и читать его в этот момент нельзя.
 */
function ElementLabel({
  name,
  type,
  t,
}: {
  name: ElementName;
  type: BlockKind;
  t: (key: string) => string;
}) {
  if (name.kind === "pending") {
    return (
      <span data-testid="element-pending" className="text-text-subtle">
        {type}
      </span>
    );
  }
  if (name.kind === "missing") {
    return <span className="text-danger-fg">{t(name.key as string)}</span>;
  }
  if (name.key) {
    return <span className="italic text-text-muted">{t(name.key)}</span>;
  }
  return (
    <span className={name.kind === "derived" ? "text-text-muted" : "text-text"}>{name.text}</span>
  );
}
