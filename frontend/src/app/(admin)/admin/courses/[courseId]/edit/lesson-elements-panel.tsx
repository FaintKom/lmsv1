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

import { useQueries, useQuery } from "@tanstack/react-query";
import { ClipboardList, Code2, FileText, Presentation, Puzzle, Video } from "lucide-react";

import apiClient from "@/lib/api-client";
import { useTranslation } from "@/lib/i18n/context";

import {
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
}

const ICONS: Record<BlockKind, typeof FileText> = {
  text: FileText,
  html: Code2,
  video: Video,
  presentation: Presentation,
  exercise: Puzzle,
  assignment: ClipboardList,
};

export function LessonElementsPanel({ open, lessonId, content }: LessonElementsPanelProps) {
  const { t } = useTranslation();
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
    <div className="mt-2 rounded-lg border border-border bg-surface-2 px-3 py-2">
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
                  <ElementRow element={element} name={resolveName(element, names)} />
                </li>
              ))}
            </ul>
          </div>
        ))
      )}
    </div>
  );
}

function ElementRow({ element, name }: { element: LessonElement; name: ElementName }) {
  const { t } = useTranslation();
  const Icon = ICONS[element.type] ?? FileText;

  return (
    <span className="flex items-center gap-2 py-1 text-sm">
      <Icon className="h-3.5 w-3.5 shrink-0 text-text-subtle" aria-hidden />
      <ElementLabel name={name} type={element.type} t={t} />
    </span>
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
