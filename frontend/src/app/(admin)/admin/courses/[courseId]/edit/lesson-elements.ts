/**
 * Из чего состоит урок — для строки на странице курса.
 *
 * Рядом лежит `lesson-summary.ts`: он считает, сколько в уроке чего, и его
 * ответ — числа. На вопрос «какие именно» отвечает этот файл, и отвечает из
 * того же содержимого, которое уже приехало вместе с курсом.
 *
 * Формат содержимого здесь не разбирается. Три поколения формата уже умеет
 * `extractPages`, а второе место, знающее про версии, — это третья возможность
 * им разойтись: одно такое расхождение уже стоило продукту надписи «No content
 * yet» под каждым уроком.
 *
 * Имени у блока нет. У текста и видео оно выводится, у задания и работы —
 * приходит запросом, поэтому имя описано состоянием, а не строкой: пока ответа
 * нет, элемент ждущий, а не безымянный.
 */

import { extractPages } from "@/lib/lessons/lesson-pages";
import type { LessonBlock } from "@/types/api";

import type { BlockKind } from "./lesson-summary";

/** Сколько знаков имени помещается в строку списка. */
const NAME_LIMIT = 60;

export type ElementNameKind = "own" | "derived" | "pending" | "missing";

/**
 * Имя элемента. `text` — готовая строка, `key` — ключ перевода: своих слов
 * этот модуль не выдумывает, шесть локалей пишутся не здесь.
 */
export interface ElementName {
  kind: ElementNameKind;
  text?: string;
  key?: string;
}

export interface LessonElement {
  blockId: string;
  type: BlockKind;
  name: ElementName;
  exerciseId?: string;
  assignmentId?: string;
}

export interface ElementsPage {
  /** Номер страницы урока, с нуля. */
  index: number;
  elements: LessonElement[];
}

/** Названия, пришедшие запросом. `null` — ответа ещё нет. */
export interface ElementNames {
  exercises: Record<string, string>;
  assignments: Record<string, string>;
}

/** Страницы урока с их элементами, в порядке, в котором их видит ученик. */
export function lessonElements(content: Record<string, unknown> | undefined): ElementsPage[] {
  return extractPages(content).map((page, index) => ({
    index,
    elements: page.blocks.filter(Boolean).map(elementOf),
  }));
}

/**
 * Имя элемента с учётом пришедшего ответа.
 *
 * Выведенное имя ответом не меняется — оно уже есть. Ждущее становится своим,
 * если название нашлось, и потерянным, если ответ пришёл без него: разница
 * важна, потому что второе означает блок, ссылающийся в никуда.
 */
export function resolveName(element: LessonElement, names: ElementNames | null): ElementName {
  if (element.name.kind !== "pending") return element.name;
  if (!names) return { kind: "pending" };

  const id = element.exerciseId ?? element.assignmentId;
  const table = element.exerciseId ? names.exercises : names.assignments;
  const found = id ? table[id] : undefined;

  return found
    ? { kind: "own", text: found }
    : { kind: "missing", key: "admin.courseEdit.elementMissing" };
}

function elementOf(block: LessonBlock): LessonElement {
  return {
    blockId: block.id,
    type: block.type,
    name: nameOf(block),
    ...(block.exercise_id ? { exerciseId: block.exercise_id } : {}),
    ...(block.assignment_id ? { assignmentId: block.assignment_id } : {}),
  };
}

function nameOf(block: LessonBlock): ElementName {
  switch (block.type) {
    case "exercise":
    case "assignment":
      return { kind: "pending" };
    case "video":
    case "presentation": {
      const name = fileName(block.url);
      return name
        ? { kind: "derived", text: name }
        : { kind: "derived", key: "admin.courseEdit.elementNoUrl" };
    }
    default: {
      const first = firstWords(block.body);
      return first
        ? { kind: "derived", text: first }
        : { kind: "derived", key: "admin.courseEdit.elementEmptyText" };
    }
  }
}

/** Первые слова содержимого без разметки, обрезанные по границе слова. */
function firstWords(body: string | Record<string, unknown> | undefined): string {
  const raw = typeof body === "string" ? body : "";
  const plain = raw
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (plain.length <= NAME_LIMIT) return plain;

  const cut = plain.slice(0, NAME_LIMIT);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 0 ? cut.slice(0, lastSpace) : cut).replace(/[,;:\s]+$/, "")}…`;
}

/** Последняя часть ссылки без расширения — то, что человек считает именем файла. */
function fileName(url: string | undefined): string {
  const last = (url ?? "").split(/[?#]/)[0].split("/").filter(Boolean).pop() ?? "";
  return last.replace(/\.[a-z0-9]{1,5}$/i, "");
}
