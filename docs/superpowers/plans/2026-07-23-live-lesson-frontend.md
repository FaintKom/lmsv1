# Live Lesson Mode — Frontend Implementation Plan (Plan 2 of 2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Teacher live-lesson screen (layout A: scene ~70% + group panel), student lesson screen, projector window, SSE client, entry points and post-lesson review.

**Architecture:** New route pair `(admin)/admin/live/[lessonId]` + `(dashboard)/lesson/[lessonId]`, shared scene components in `src/components/live/`. Server state via TanStack Query seeded by GET + patched by SSE events (`queryClient.setQueryData`). One `EventSource` per screen in a dedicated hook. Excalidraw reused from whiteboard-v2 patterns.

**Tech Stack:** Next.js 16 App Router ("use client" pages), TanStack Query, EventSource (first in codebase), @excalidraw/excalidraw, sonner, Tailwind semantic tokens, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-07-23-live-lesson-mode-design.md`. Backend — Plan 1 (must be implemented first; all endpoints referenced here exist after Plan 1).

**Codebase conventions used (verified):**
- API: `import apiClient from "@/lib/api-client"` — axios, `baseURL: "/api/v1"`, `withCredentials: true`, httpOnly-cookie auth, 401-refresh singleton built in. Wrapper style = `src/lib/api/journal.ts`: interfaces → raw async fns returning `data` → TanStack hooks below, queryKey arrays `["live", ...]`.
- i18n: `import { useTranslation } from "@/lib/i18n/context"`; every new user-facing string is a dotted key added to ALL SIX `src/lib/i18n/locales/{en,es,ru,tr,de,uk}.ts` (flat maps); ratchet test `no-hardcoded-strings.test.ts` fails any new `.tsx` that neither calls `useTranslation()` nor sits in `i18n-allowlist.ts`.
- Excalidraw: dynamic import `{ ssr: false }`, API via `excalidrawAPI={(api) => ...}` ref, scenes as `{elements, appState, files}` (see `src/components/exercises/v2/whiteboard-v2.tsx`).
- Exercise player: `V2ExerciseLive({ exercise, onFinish?, onQuit? })` from `src/components/exercises/v2-exercise-live.tsx` (server-graded; supports types in `V2_LIVE_TYPES` = true_false | fill_blanks | ordering).
- Theory: `ContentRenderer({ body, format })` from `src/components/common/content-renderer.tsx`.
- Toasts: `import { toast } from "sonner"`.
- Tests: Vitest jsdom, `vi.mock("@/lib/i18n/context", ...)` pattern from `src/components/support/donation-form.test.tsx`; Playwright specs in `frontend/e2e/`, login via `e2e/poms/LoginPage.ts` (`loginViaUi(role)`).

Run all commands from `frontend/`.

---

### Task 1: API layer — `src/lib/api/live.ts`

**Files:**
- Create: `frontend/src/lib/api/live.ts`

- [ ] **Step 1: Write the module** (thin wrapper — exercised by hook/component tests later; no dedicated unit test)

```ts
import apiClient from "@/lib/api-client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

// ---------- types (mirror backend schemas, Plan 1 Task 3) ----------

export type SceneType = "blank" | "board" | "material" | "task" | "solution";
export type FollowMode = "strict" | "free";
export type SignalType = "hand" | "confused" | "done";

export interface Scene {
  type: SceneType;
  payload: Record<string, unknown>;
}

export interface LiveLesson {
  id: string;
  org_id: string;
  group_id: string;
  course_id: string | null;
  teacher_id: string | null;
  class_session_id: string | null;
  status: "active" | "ended";
  follow_mode: FollowMode;
  current_scene: Scene | null;
  created_at: string;
  ended_at: string | null;
  summary: Record<string, unknown> | null;
}

export interface Poll {
  question: string;
  options: string[];
}

export interface PollResult extends Poll {
  counts: number[];
}

export interface LessonState {
  lesson: LiveLesson;
  my_signal: SignalType | null;
  active_poll: Poll | null;
}

export interface Board {
  id: string;
  kind: "board" | "annotation";
  scene: { elements: Record<string, unknown>[]; appState: Record<string, unknown> };
  version: number;
  material_ref: string | null;
}

export interface BoardDelta {
  updated: Record<string, unknown>[];
  deleted: string[];
  version: number;
}

export interface RosterMember {
  id: string;
  name: string;
  online: boolean;
  current_view: string | null;
  exercise_id: string | null;
  signal: SignalType | null;
}

export interface ProgressRow {
  id: string;
  name: string;
  submitted: boolean;
  passed: boolean | null;
  score: number | null;
  attempts: number;
  draft_updated_at: string | null;
}

export interface Draft {
  exercise_id: string;
  student_id: string;
  answers: Record<string, unknown> | null;
  source_code: string | null;
  updated_at: string;
}

// ---------- raw calls ----------

export async function startLesson(groupId: string): Promise<LiveLesson> {
  const { data } = await apiClient.post<LiveLesson>("/live-lessons", { group_id: groupId });
  return data;
}

export async function endLesson(lessonId: string): Promise<LiveLesson> {
  const { data } = await apiClient.post<LiveLesson>(`/live-lessons/${lessonId}/end`);
  return data;
}

export async function fetchLessonState(lessonId: string): Promise<LessonState> {
  const { data } = await apiClient.get<LessonState>(`/live-lessons/${lessonId}`);
  return data;
}

export async function fetchActiveLesson(): Promise<string | null> {
  const { data } = await apiClient.get<{ lesson_id: string | null }>("/live-lessons/active");
  return data.lesson_id;
}

export async function fetchLessons(): Promise<LiveLesson[]> {
  const { data } = await apiClient.get<LiveLesson[]>("/live-lessons");
  return data;
}

export async function setScene(lessonId: string, scene: Scene): Promise<LiveLesson> {
  const { data } = await apiClient.patch<LiveLesson>(`/live-lessons/${lessonId}/scene`, scene);
  return data;
}

export async function setFollowMode(lessonId: string, follow_mode: FollowMode): Promise<LiveLesson> {
  const { data } = await apiClient.patch<LiveLesson>(`/live-lessons/${lessonId}/settings`, { follow_mode });
  return data;
}

export async function createBoard(
  lessonId: string, kind: "board" | "annotation", materialRef?: string,
): Promise<Board> {
  const { data } = await apiClient.post<Board>(`/live-lessons/${lessonId}/boards`, {
    kind, material_ref: materialRef ?? null,
  });
  return data;
}

export async function fetchBoard(lessonId: string, boardId: string): Promise<Board> {
  const { data } = await apiClient.get<Board>(`/live-lessons/${lessonId}/boards/${boardId}`);
  return data;
}

export async function sendBoardDelta(lessonId: string, boardId: string, delta: BoardDelta): Promise<Board> {
  const { data } = await apiClient.patch<Board>(`/live-lessons/${lessonId}/boards/${boardId}`, delta);
  return data;
}

export async function sendHeartbeat(lessonId: string, currentView: string, exerciseId?: string) {
  await apiClient.post(`/live-lessons/${lessonId}/heartbeat`,
    { current_view: currentView, exercise_id: exerciseId ?? null },
    { _silentError: true } as object);
}

export async function fetchRoster(lessonId: string): Promise<{ members: RosterMember[] }> {
  const { data } = await apiClient.get(`/live-lessons/${lessonId}/roster`);
  return data;
}

export async function fetchProgress(lessonId: string, exerciseId: string): Promise<{ students: ProgressRow[] }> {
  const { data } = await apiClient.get(`/live-lessons/${lessonId}/progress`, {
    params: { exercise_id: exerciseId },
  });
  return data;
}

export async function setSignal(lessonId: string, type: SignalType) {
  await apiClient.post(`/live-lessons/${lessonId}/signals`, { type });
}

export async function clearSignal(lessonId: string) {
  await apiClient.delete(`/live-lessons/${lessonId}/signals`);
}

export async function startPoll(lessonId: string, question: string, options: string[]): Promise<Poll> {
  const { data } = await apiClient.post<Poll>(`/live-lessons/${lessonId}/polls`, { question, options });
  return data;
}

export async function votePoll(lessonId: string, option: number) {
  await apiClient.post(`/live-lessons/${lessonId}/polls/vote`, { option });
}

export async function closePoll(lessonId: string): Promise<PollResult> {
  const { data } = await apiClient.post<PollResult>(`/live-lessons/${lessonId}/polls/close`);
  return data;
}

export async function sendHint(lessonId: string, studentId: string, text: string) {
  await apiClient.post(`/live-lessons/${lessonId}/messages`, { student_id: studentId, text });
}

export async function saveDraft(exerciseId: string, answers: Record<string, unknown> | null, sourceCode?: string) {
  await apiClient.post(`/exercises/${exerciseId}/draft`,
    { answers, source_code: sourceCode ?? null },
    { _silentError: true } as object);
}

export async function fetchDraft(exerciseId: string, studentId: string, etag?: string): Promise<Draft | null> {
  const resp = await apiClient.get<Draft>(`/exercises/${exerciseId}/drafts/${studentId}`, {
    headers: etag ? { "If-None-Match": etag } : {},
    validateStatus: (s) => s === 200 || s === 304 || s === 404,
  });
  if (resp.status !== 200) return null;
  return { ...resp.data, updated_at: resp.headers["etag"] ?? resp.data.updated_at };
}

// ---------- hooks ----------

export function useLessonState(lessonId: string) {
  return useQuery({
    queryKey: ["live", lessonId, "state"],
    queryFn: () => fetchLessonState(lessonId),
    enabled: !!lessonId,
    staleTime: Infinity, // SSE keeps it fresh; refetch happens on reconnect
  });
}

export function useRoster(lessonId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["live", lessonId, "roster"],
    queryFn: () => fetchRoster(lessonId),
    enabled,
    staleTime: Infinity,
  });
}

export function useProgress(lessonId: string, exerciseId: string | null) {
  return useQuery({
    queryKey: ["live", lessonId, "progress", exerciseId],
    queryFn: () => fetchProgress(lessonId, exerciseId as string),
    enabled: !!exerciseId,
    staleTime: Infinity,
  });
}

export function useSetScene(lessonId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (scene: Scene) => setScene(lessonId, scene),
    onSuccess: (lesson) => {
      qc.setQueryData<LessonState>(["live", lessonId, "state"],
        (old) => (old ? { ...old, lesson } : old));
    },
  });
}
```

Note on `_silentError`: the axios interceptor in `api-client.ts` skips its error toast when the request config carries `_silentError` — heartbeat/draft failures must be silent (spec §11). Verify the exact flag name at the top of `src/lib/api-client.ts` (`originalRequest._silentError`) and match it.

- [ ] **Step 2: Typecheck**

Run: `cd frontend && npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/lib/api/live.ts
git commit -m "feat(live-frontend): typed API layer + query hooks for live lessons"
```

---

### Task 2: SSE hook — `src/hooks/use-lesson-channel.ts`

**Files:**
- Create: `frontend/src/hooks/use-lesson-channel.ts`
- Test: `frontend/src/hooks/use-lesson-channel.test.ts`

Design: one `EventSource` per mounted screen. `GET /api/v1/live-lessons/{id}/events` (same-origin, cookies ride along automatically). Named SSE events → typed handlers. On `open` after a drop → invalidate `["live", lessonId]` queries (reconnect = refetch full state, spec §7). `lesson_ended` → handler + close.

- [ ] **Step 1: Write failing test**

`frontend/src/hooks/use-lesson-channel.test.ts`:

```ts
import { renderHook, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

import { useLessonChannel } from "./use-lesson-channel";

class FakeEventSource {
  static instances: FakeEventSource[] = [];
  url: string;
  listeners: Record<string, ((e: MessageEvent) => void)[]> = {};
  onopen: (() => void) | null = null;
  onerror: (() => void) | null = null;
  closed = false;
  constructor(url: string) {
    this.url = url;
    FakeEventSource.instances.push(this);
  }
  addEventListener(type: string, cb: (e: MessageEvent) => void) {
    (this.listeners[type] ??= []).push(cb);
  }
  emit(type: string, data: unknown) {
    for (const cb of this.listeners[type] ?? []) {
      cb({ data: JSON.stringify(data) } as MessageEvent);
    }
  }
  close() { this.closed = true; }
}

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn(), setQueryData: vi.fn() }),
}));

describe("useLessonChannel", () => {
  beforeEach(() => {
    FakeEventSource.instances = [];
    vi.stubGlobal("EventSource", FakeEventSource as unknown as typeof EventSource);
  });

  it("subscribes and dispatches scene_changed", () => {
    const onScene = vi.fn();
    renderHook(() => useLessonChannel("L1", { onSceneChanged: onScene }));
    const es = FakeEventSource.instances[0];
    expect(es.url).toBe("/api/v1/live-lessons/L1/events");
    act(() => es.emit("scene_changed", { type: "board", payload: { board_id: "b1" } }));
    expect(onScene).toHaveBeenCalledWith({ type: "board", payload: { board_id: "b1" } });
  });

  it("closes on unmount and on lesson_ended", () => {
    const onEnded = vi.fn();
    const { unmount } = renderHook(() => useLessonChannel("L1", { onLessonEnded: onEnded }));
    const es = FakeEventSource.instances[0];
    act(() => es.emit("lesson_ended", {}));
    expect(onEnded).toHaveBeenCalled();
    expect(es.closed).toBe(true);
    unmount();
  });
});
```

- [ ] **Step 2: Run — verify failure**

Run: `cd frontend && npx vitest run src/hooks/use-lesson-channel.test.ts`
Expected: FAIL (module missing).

- [ ] **Step 3: Implement**

```ts
"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

import type { BoardDelta, FollowMode, Poll, PollResult, Scene, SignalType } from "@/lib/api/live";

export interface LessonChannelHandlers {
  onSceneChanged?: (scene: Scene) => void;
  onBoardDelta?: (delta: BoardDelta & { board_id: string }) => void;
  onSettingsChanged?: (s: { follow_mode: FollowMode }) => void;
  onPollStarted?: (poll: Poll) => void;
  onPollClosed?: (result: PollResult) => void;
  onPollProgress?: (p: { counts: number[] }) => void;
  onPresence?: (p: { student_id: string; online: boolean; view: string; exercise_id: string | null }) => void;
  onSignal?: (s: { student_id: string; type: SignalType | null; on: boolean }) => void;
  onSubmission?: (s: { student_id: string; exercise_id: string; passed: boolean | null; score: number | null }) => void;
  onMessage?: (m: { text: string }) => void;
  onLessonEnded?: () => void;
}

const EVENT_NAMES = [
  "scene_changed", "board_delta", "settings_changed", "poll_started",
  "poll_closed", "poll_progress", "presence", "signal", "submission",
  "message", "lesson_ended",
] as const;

export function useLessonChannel(lessonId: string | null, handlers: LessonChannelHandlers) {
  const qc = useQueryClient();
  // latest-handlers ref so the EventSource effect doesn't resubscribe per render
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!lessonId) return;
    const es = new EventSource(`/api/v1/live-lessons/${lessonId}/events`);
    let hadDrop = false;

    es.onopen = () => {
      if (hadDrop) {
        // reconnect: refetch authoritative state (spec: no Last-Event-ID replay)
        qc.invalidateQueries({ queryKey: ["live", lessonId] });
      }
    };
    es.onerror = () => { hadDrop = true; }; // EventSource auto-reconnects

    const dispatch: Record<string, (data: never) => void> = {
      scene_changed: (d) => handlersRef.current.onSceneChanged?.(d),
      board_delta: (d) => handlersRef.current.onBoardDelta?.(d),
      settings_changed: (d) => handlersRef.current.onSettingsChanged?.(d),
      poll_started: (d) => handlersRef.current.onPollStarted?.(d),
      poll_closed: (d) => handlersRef.current.onPollClosed?.(d),
      poll_progress: (d) => handlersRef.current.onPollProgress?.(d),
      presence: (d) => handlersRef.current.onPresence?.(d),
      signal: (d) => handlersRef.current.onSignal?.(d),
      submission: (d) => handlersRef.current.onSubmission?.(d),
      message: (d) => handlersRef.current.onMessage?.(d),
      lesson_ended: () => {
        handlersRef.current.onLessonEnded?.();
        es.close();
      },
    };
    for (const name of EVENT_NAMES) {
      es.addEventListener(name, (e) => {
        dispatch[name](JSON.parse((e as MessageEvent).data));
      });
    }
    return () => es.close();
  }, [lessonId, qc]);
}
```

- [ ] **Step 4: Run tests** — `npx vitest run src/hooks/use-lesson-channel.test.ts` → PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/hooks/use-lesson-channel.ts frontend/src/hooks/use-lesson-channel.test.ts
git commit -m "feat(live-frontend): SSE channel hook with reconnect invalidation"
```

---

### Task 3: i18n keys (all 6 locales)

**Files:**
- Modify: `frontend/src/lib/i18n/locales/en.ts` (+ es, ru, tr, de, uk)

- [ ] **Step 1: Add keys**

Add this block to `en.ts` (translate in the other five; ru given below):

```ts
  // Live lessons
  "live.lesson": "Live lesson",
  "live.start": "Start lesson",
  "live.end": "End lesson",
  "live.endConfirm": "End the lesson for everyone?",
  "live.joinBanner": "A live lesson is in progress",
  "live.join": "Join",
  "live.online": "online",
  "live.scene.blank": "Idle",
  "live.scene.board": "Board",
  "live.scene.material": "Material",
  "live.scene.task": "Task",
  "live.scene.solution": "Review",
  "live.followMode.strict": "Follow me",
  "live.followMode.free": "Free",
  "live.backToLesson": "Back to lesson",
  "live.projector": "Projector",
  "live.tab.group": "Group",
  "live.tab.task": "Task",
  "live.tab.poll": "Poll",
  "live.signal.hand": "Raise hand",
  "live.signal.confused": "I'm lost",
  "live.signal.done": "Done",
  "live.signal.clear": "Clear",
  "live.poll.question": "Question",
  "live.poll.options": "Options (one per line)",
  "live.poll.start": "Start poll",
  "live.poll.close": "Close poll",
  "live.poll.vote": "Vote",
  "live.poll.results": "Poll results",
  "live.hint.placeholder": "Hint for the student…",
  "live.hint.send": "Send hint",
  "live.hint.received": "Hint from your teacher",
  "live.assignTask": "Assign to group",
  "live.pickExercise": "Pick an exercise",
  "live.pickMaterial": "Pick a material",
  "live.showSolution": "Show solution",
  "live.anonymous": "Anonymous",
  "live.notInLesson": "not in lesson",
  "live.draft": "Draft",
  "live.submitted": "Submitted",
  "live.notStarted": "Not started",
  "live.attempts": "attempts",
  "live.reconnecting": "Reconnecting…",
  "live.endedTitle": "Lesson ended",
  "live.review": "Lesson review",
  "live.pastLessons": "Past lessons",
  "live.newBoard": "New board",
  "live.annotate": "Draw over",
```

Russian (`ru.ts`) values, same keys, in order: "Живой урок", "Начать урок", "Завершить урок", "Завершить урок для всех?", "Идёт живой урок", "Войти", "онлайн", "Заставка", "Доска", "Материал", "Задание", "Разбор", "Следовать за мной", "Свободно", "Вернуться к уроку", "Проектор", "Группа", "Задание", "Опрос", "Поднять руку", "Мне непонятно", "Готово", "Снять", "Вопрос", "Варианты (по одному в строке)", "Запустить опрос", "Закрыть опрос", "Голосовать", "Результаты опроса", "Подсказка ученику…", "Отправить подсказку", "Подсказка от преподавателя", "Выдать группе", "Выбрать упражнение", "Выбрать материал", "Показать решение", "Анонимно", "не в уроке", "Черновик", "Сдано", "Не начато", "попыток", "Переподключение…", "Урок завершён", "Итоги урока", "Прошедшие занятия", "Новая доска", "Рисовать поверх".

es/tr/de/uk: translate the same keys, matching the tone of neighbouring keys in each file.

- [ ] **Step 2: Run parity test**

Run: `cd frontend && npx vitest run src/lib/i18n/translations.test.ts`
Expected: PASS (all locales have identical key sets).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/lib/i18n/locales
git commit -m "feat(live-frontend): i18n keys for live lessons (6 locales)"
```

---

### Task 4: Board components — read-only view + teacher editor with delta sync

**Files:**
- Create: `frontend/src/components/live/board-view.tsx`
- Create: `frontend/src/components/live/board-editor.tsx`
- Test: `frontend/src/components/live/board-delta.test.ts`
- Create: `frontend/src/components/live/board-delta.ts` (pure diff logic — testable without Excalidraw)

- [ ] **Step 1: Write failing test for the diff logic**

`frontend/src/components/live/board-delta.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { applyDelta, diffElements } from "./board-delta";

const el = (id: string, version: number, isDeleted = false) => ({ id, version, isDeleted });

describe("diffElements", () => {
  it("detects new and changed elements by version", () => {
    const lastSent = new Map([["a", 1]]);
    const current = [el("a", 2), el("b", 1)];
    const d = diffElements(current, lastSent);
    expect(d.updated.map((e) => e.id)).toEqual(["a", "b"]);
    expect(d.deleted).toEqual([]);
  });

  it("moves isDeleted elements into deleted list", () => {
    const lastSent = new Map([["a", 1]]);
    const d = diffElements([el("a", 2, true)], lastSent);
    expect(d.updated).toEqual([]);
    expect(d.deleted).toEqual(["a"]);
  });

  it("returns empty diff when nothing changed", () => {
    const lastSent = new Map([["a", 2]]);
    const d = diffElements([el("a", 2)], lastSent);
    expect(d.updated).toEqual([]);
    expect(d.deleted).toEqual([]);
  });
});

describe("applyDelta", () => {
  it("upserts and removes elements", () => {
    const scene = [el("a", 1), el("b", 1)];
    const next = applyDelta(scene, { updated: [el("a", 2)], deleted: ["b"], version: 2 });
    expect(next.map((e) => e.id)).toEqual(["a"]);
    expect((next[0] as { version: number }).version).toBe(2);
  });
});
```

- [ ] **Step 2: Run — verify failure** (`npx vitest run src/components/live/board-delta.test.ts`)

- [ ] **Step 3: Implement `board-delta.ts`**

```ts
// Excalidraw elements carry {id, version, isDeleted}. We diff against the
// last-SENT versions, not previous onChange — onChange fires on every pointer move.

export interface ExElement {
  id: string;
  version: number;
  isDeleted?: boolean;
  [k: string]: unknown;
}

export interface Delta {
  updated: ExElement[];
  deleted: string[];
}

export function diffElements(current: ExElement[], lastSent: Map<string, number>): Delta {
  const updated: ExElement[] = [];
  const deleted: string[] = [];
  for (const e of current) {
    const sent = lastSent.get(e.id);
    if (e.isDeleted) {
      if (sent !== undefined) deleted.push(e.id);
      continue;
    }
    if (sent === undefined || sent < e.version) updated.push(e);
  }
  return { updated, deleted };
}

export function markSent(delta: Delta, lastSent: Map<string, number>): void {
  for (const e of delta.updated) lastSent.set(e.id, e.version);
  for (const id of delta.deleted) lastSent.delete(id);
}

export function applyDelta(
  elements: ExElement[],
  delta: { updated: ExElement[]; deleted: string[]; version: number },
): ExElement[] {
  const map = new Map(elements.map((e) => [e.id, e]));
  for (const e of delta.updated) map.set(e.id, e);
  for (const id of delta.deleted) map.delete(id);
  return [...map.values()];
}
```

- [ ] **Step 4: Run diff tests** — PASS.

- [ ] **Step 5: `board-view.tsx`** (student + projector; read-only, applies deltas)

```tsx
"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

import { fetchBoard } from "@/lib/api/live";
import { useTranslation } from "@/lib/i18n/context";

import { applyDelta, type ExElement } from "./board-delta";

const Excalidraw = dynamic(
  () => import("@excalidraw/excalidraw").then((m) => m.Excalidraw),
  { ssr: false },
);

export interface BoardViewHandle {
  /** Feed an SSE board_delta into the view. */
  applyRemoteDelta: (d: { board_id: string; updated: ExElement[]; deleted: string[]; version: number }) => void;
}

interface Props {
  lessonId: string;
  boardId: string;
  handleRef: React.MutableRefObject<BoardViewHandle | null>;
}

export function BoardView({ lessonId, boardId, handleRef }: Props) {
  const { t } = useTranslation();
  const apiRef = useRef<{ updateScene: (s: { elements: ExElement[] }) => void } | null>(null);
  const elementsRef = useRef<ExElement[]>([]);
  const versionRef = useRef(0);
  const [initial, setInitial] = useState<{ elements: ExElement[] } | null>(null);
  const [loading, setLoading] = useState(true);

  const loadFull = async () => {
    const board = await fetchBoard(lessonId, boardId);
    elementsRef.current = board.scene.elements as ExElement[];
    versionRef.current = board.version;
    setInitial({ elements: elementsRef.current });
    apiRef.current?.updateScene({ elements: elementsRef.current });
    setLoading(false);
  };

  useEffect(() => {
    void loadFull();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId, boardId]);

  useEffect(() => {
    handleRef.current = {
      applyRemoteDelta: (d) => {
        if (d.board_id !== boardId) return;
        if (d.version !== versionRef.current + 1) {
          void loadFull(); // gap -> full resync (spec §8)
          return;
        }
        versionRef.current = d.version;
        elementsRef.current = applyDelta(elementsRef.current, d);
        apiRef.current?.updateScene({ elements: elementsRef.current });
      },
    };
    return () => { handleRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardId]);

  if (loading && !initial) {
    return <div className="flex h-full items-center justify-center text-text-muted">{t("common.loading")}</div>;
  }
  return (
    <div className="h-full w-full">
      <Excalidraw
        excalidrawAPI={(api: never) => { apiRef.current = api; }}
        initialData={{ elements: initial?.elements ?? [], appState: { viewModeEnabled: true } }}
        viewModeEnabled
      />
    </div>
  );
}
```

(`common.loading` already exists in locales; verify — otherwise use `t("live.reconnecting")`.)

- [ ] **Step 6: `board-editor.tsx`** (teacher; sends throttled deltas)

```tsx
"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef } from "react";

import { fetchBoard, sendBoardDelta } from "@/lib/api/live";
import { useTranslation } from "@/lib/i18n/context";

import { diffElements, markSent, type ExElement } from "./board-delta";

const Excalidraw = dynamic(
  () => import("@excalidraw/excalidraw").then((m) => m.Excalidraw),
  { ssr: false },
);

const SEND_THROTTLE_MS = 500;

export function BoardEditor({ lessonId, boardId }: { lessonId: string; boardId: string }) {
  const { t } = useTranslation();
  const lastSentRef = useRef(new Map<string, number>());
  const versionRef = useRef(0);
  const latestRef = useRef<ExElement[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialRef = useRef<{ elements: ExElement[] } | null>(null);
  const readyRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    void fetchBoard(lessonId, boardId).then((board) => {
      if (cancelled) return;
      versionRef.current = board.version;
      const els = board.scene.elements as ExElement[];
      initialRef.current = { elements: els };
      lastSentRef.current = new Map(els.map((e) => [e.id, e.version]));
      readyRef.current = true;
    });
    return () => { cancelled = true; };
  }, [lessonId, boardId]);

  const flush = async () => {
    timerRef.current = null;
    const delta = diffElements(latestRef.current, lastSentRef.current);
    if (delta.updated.length === 0 && delta.deleted.length === 0) return;
    const nextVersion = versionRef.current + 1;
    try {
      await sendBoardDelta(lessonId, boardId, { ...delta, version: nextVersion });
      versionRef.current = nextVersion;
      markSent(delta, lastSentRef.current);
    } catch {
      // failed send: keep lastSent as-is; the next flush retries the same diff
    }
  };

  const onChange = (elements: readonly ExElement[]) => {
    if (!readyRef.current) return;
    latestRef.current = elements as ExElement[];
    if (timerRef.current == null) {
      timerRef.current = setTimeout(() => void flush(), SEND_THROTTLE_MS);
    }
  };

  // flush pending changes on unmount
  useEffect(() => () => {
    if (timerRef.current != null) {
      clearTimeout(timerRef.current);
      void flush();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!readyRef.current && !initialRef.current) {
    return <div className="flex h-full items-center justify-center text-text-muted">{t("live.reconnecting")}</div>;
  }
  return (
    <div className="h-full w-full">
      <Excalidraw
        initialData={initialRef.current ?? { elements: [] }}
        onChange={onChange as never}
      />
    </div>
  );
}
```

Implementation note: the loading gate above uses refs for brevity; refs don't trigger re-render — introduce a `const [ready, setReady] = useState(false)` mirroring `readyRef` and render Excalidraw only when `ready`. Keep the refs for the sync logic.

- [ ] **Step 7: Typecheck + tests**

Run: `npx tsc --noEmit && npx vitest run src/components/live/board-delta.test.ts`
Expected: clean, tests PASS.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/components/live
git commit -m "feat(live-frontend): board delta sync (pure diff + editor/view components)"
```

---

### Task 5: Shared scene renderer + student widgets

**Files:**
- Create: `frontend/src/components/live/scene-view.tsx`
- Create: `frontend/src/components/live/signal-bar.tsx`
- Create: `frontend/src/components/live/poll-modal.tsx`

- [ ] **Step 1: `scene-view.tsx`** — renders the current scene for student and projector

```tsx
"use client";

import { useEffect, useState } from "react";

import { ContentRenderer } from "@/components/common/content-renderer";
import { V2ExerciseLive } from "@/components/exercises/v2-exercise-live";
import apiClient from "@/lib/api-client";
import type { Scene } from "@/lib/api/live";
import { useTranslation } from "@/lib/i18n/context";

import { BoardView, type BoardViewHandle } from "./board-view";

interface Props {
  lessonId: string;
  scene: Scene;
  boardHandleRef: React.MutableRefObject<BoardViewHandle | null>;
  /** student only; projector passes undefined */
  onDraft?: (exerciseId: string, answers: Record<string, unknown>) => void;
  interactive: boolean; // false on projector
}

export function SceneView({ lessonId, scene, boardHandleRef, interactive }: Props) {
  const { t } = useTranslation();

  if (scene.type === "board" || (scene.type === "material" && scene.payload.annotation_board_id)) {
    const boardId = (scene.payload.board_id ?? scene.payload.annotation_board_id) as string;
    return (
      <div className="relative h-full">
        {scene.type === "material" && <MaterialPane lessonId={lessonId} payload={scene.payload} />}
        <div className={scene.type === "material" ? "pointer-events-none absolute inset-0" : "h-full"}>
          <BoardView lessonId={lessonId} boardId={boardId} handleRef={boardHandleRef} />
        </div>
      </div>
    );
  }
  if (scene.type === "material") {
    return <MaterialPane lessonId={lessonId} payload={scene.payload} />;
  }
  if (scene.type === "task") {
    return <TaskPane exerciseId={scene.payload.exercise_id as string} interactive={interactive} />;
  }
  if (scene.type === "solution") {
    return <SolutionPane payload={scene.payload} />;
  }
  return (
    <div className="flex h-full items-center justify-center text-2xl text-text-muted">
      {t("live.lesson")}
    </div>
  );
}

function MaterialPane({ payload }: { lessonId: string; payload: Record<string, unknown> }) {
  const [content, setContent] = useState<{ body: unknown; format: string } | null>(null);
  useEffect(() => {
    let cancelled = false;
    void apiClient
      .get(`/courses/lessons/${payload.lesson_id}`)
      .then(({ data }) => {
        if (!cancelled) setContent({ body: data.content?.body ?? data.content, format: "tiptap" });
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [payload.lesson_id]);
  if (!content) return null;
  return (
    <div className="h-full overflow-y-auto p-6">
      <ContentRenderer body={content.body as never} format={content.format as never} />
    </div>
  );
}

function TaskPane({ exerciseId, interactive }: { exerciseId: string; interactive: boolean }) {
  const { t } = useTranslation();
  const [exercise, setExercise] = useState<Record<string, unknown> | null>(null);
  useEffect(() => {
    let cancelled = false;
    void apiClient.get(`/exercises/${exerciseId}`).then(({ data }) => {
      if (!cancelled) setExercise(data);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [exerciseId]);
  if (!exercise) return null;
  if (!interactive) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2">
        <div className="text-3xl font-bold">{String(exercise.title ?? "")}</div>
        <div className="text-text-muted">{t("live.scene.task")}</div>
      </div>
    );
  }
  return <V2ExerciseLive exercise={exercise as never} />;
}

function SolutionPane({ payload }: { payload: Record<string, unknown> }) {
  const { t } = useTranslation();
  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mb-4 text-sm text-text-muted">
        {payload.anonymous ? t("live.anonymous") : String(payload.student_name ?? "")}
      </div>
      {payload.source_code ? (
        <pre className="overflow-x-auto rounded-lg bg-surface-2 p-4 font-mono text-sm">
          {String(payload.source_code)}
        </pre>
      ) : null}
      {payload.answers ? (
        <pre className="mt-4 overflow-x-auto rounded-lg bg-surface-2 p-4 font-mono text-sm">
          {JSON.stringify(payload.answers, null, 2)}
        </pre>
      ) : null}
    </div>
  );
}
```

Verify the two GET paths against the real routers before wiring: single-lesson content endpoint (`/courses/lessons/{id}` — check `backend/app/courses/router.py` for the exact route; the student lesson page `(dashboard)/courses/[courseId]/lessons/[lessonId]/page.tsx` shows the working call) and single-exercise endpoint (`/exercises/{id}` — check `exercises/router.py`; it exists, used by `exercisesApi.getById`). Adjust paths to match reality — the component structure stands.

- [ ] **Step 2: `signal-bar.tsx`**

```tsx
"use client";

import { useState } from "react";

import { clearSignal, setSignal, type SignalType } from "@/lib/api/live";
import { useTranslation } from "@/lib/i18n/context";

export function SignalBar({ lessonId, initial }: { lessonId: string; initial: SignalType | null }) {
  const { t } = useTranslation();
  const [active, setActive] = useState<SignalType | null>(initial);

  const toggle = async (type: SignalType) => {
    if (active === type) {
      setActive(null);
      await clearSignal(lessonId);
    } else {
      setActive(type);
      await setSignal(lessonId, type);
    }
  };

  const btn = (type: SignalType, label: string, emoji: string) => (
    <button
      key={type}
      onClick={() => void toggle(type)}
      className={`rounded-pill px-4 py-2 text-sm font-medium transition ${
        active === type ? "bg-primary text-white" : "bg-surface-2 text-text hover:bg-paper-2"
      }`}
    >
      {emoji} {label}
    </button>
  );

  return (
    <div className="flex items-center justify-center gap-3 border-t border-border bg-paper-2 p-3">
      {btn("hand", t("live.signal.hand"), "✋")}
      {btn("confused", t("live.signal.confused"), "🤔")}
      {btn("done", t("live.signal.done"), "✅")}
    </div>
  );
}
```

- [ ] **Step 3: `poll-modal.tsx`**

```tsx
"use client";

import { useState } from "react";

import { votePoll, type Poll } from "@/lib/api/live";
import { useTranslation } from "@/lib/i18n/context";

export function PollModal({ lessonId, poll, onDone }: {
  lessonId: string; poll: Poll; onDone: () => void;
}) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<number | null>(null);
  const [voted, setVoted] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-lg bg-paper-2 p-6 shadow-lg">
        <h3 className="mb-4 text-lg font-semibold">{poll.question}</h3>
        <div className="flex flex-col gap-2">
          {poll.options.map((opt, i) => (
            <button
              key={i}
              disabled={voted}
              onClick={() => setSelected(i)}
              className={`rounded-lg border p-3 text-left ${
                selected === i ? "border-primary bg-primary/10" : "border-border"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
        <button
          disabled={selected === null || voted}
          onClick={async () => {
            if (selected === null) return;
            setVoted(true);
            await votePoll(lessonId, selected);
            onDone();
          }}
          className="mt-4 w-full rounded-lg bg-primary p-3 font-medium text-white disabled:opacity-50"
        >
          {t("live.poll.vote")}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Typecheck** — `npx tsc --noEmit` clean.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/live
git commit -m "feat(live-frontend): scene renderer, student signal bar, poll modal"
```

---

> **Scope note discovered while planning (spec deviation, deliberate):**
> `V2ExerciseLive` supports only `true_false | fill_blanks | ordering` and its child
> components do not expose in-progress answers. Live draft capture for click-style
> answers is near-worthless, so **v1 does NOT wire draft sending from the exercise
> player**. The whole draft backend (Plan 1 Task 10) stays — it activates when
> code/text exercise types are added to the live player. The teacher drawer shows
> submissions and a "no draft" state meanwhile.

---

### Task 6: Student page — `(dashboard)/lesson/[lessonId]/page.tsx`

**Files:**
- Create: `frontend/src/app/(dashboard)/lesson/[lessonId]/page.tsx`
- Modify: `frontend/src/app/(dashboard)/layout.tsx` (sidebar auto-collapse for `/lesson/`)

- [ ] **Step 1: Page**

```tsx
"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

import { PollModal } from "@/components/live/poll-modal";
import { SceneView } from "@/components/live/scene-view";
import { SignalBar } from "@/components/live/signal-bar";
import type { BoardViewHandle } from "@/components/live/board-view";
import { sendHeartbeat, useLessonState, type Poll, type PollResult, type Scene } from "@/lib/api/live";
import { useLessonChannel } from "@/hooks/use-lesson-channel";
import { useTranslation } from "@/lib/i18n/context";

export default function StudentLessonPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useParams<{ lessonId: string }>();
  const lessonId = params.lessonId;
  const qc = useQueryClient();

  const { data: state, isLoading } = useLessonState(lessonId);
  const [scene, setScene] = useState<Scene | null>(null);
  const [poll, setPoll] = useState<Poll | null>(null);
  const [pollResult, setPollResult] = useState<PollResult | null>(null);
  const [ended, setEnded] = useState(false);
  const boardHandleRef = useRef<BoardViewHandle | null>(null);

  // seed local scene/poll from the authoritative GET
  useEffect(() => {
    if (state) {
      setScene(state.lesson.current_scene);
      setPoll(state.active_poll);
      if (state.lesson.status === "ended") setEnded(true);
    }
  }, [state]);

  useLessonChannel(ended ? null : lessonId, {
    onSceneChanged: (s) => setScene(s),
    onBoardDelta: (d) => boardHandleRef.current?.applyRemoteDelta(d),
    onPollStarted: (p) => { setPollResult(null); setPoll(p); },
    onPollClosed: (r) => { setPoll(null); setPollResult(r); },
    onMessage: (m) => toast(t("live.hint.received"), { description: m.text, duration: 15000 }),
    onLessonEnded: () => setEnded(true),
  });

  // heartbeat every 5s while mounted
  useEffect(() => {
    if (ended) return;
    const beat = () => {
      const exerciseId = scene?.type === "task"
        ? (scene.payload.exercise_id as string) : undefined;
      void sendHeartbeat(lessonId, scene?.type ?? "scene", exerciseId);
    };
    beat();
    const iv = setInterval(beat, 5000);
    return () => clearInterval(iv);
  }, [lessonId, scene, ended]);

  if (isLoading || !state) return null;

  if (ended) {
    return (
      <div className="flex h-[calc(100vh-4rem)] flex-col items-center justify-center gap-4">
        <div className="text-2xl font-semibold">{t("live.endedTitle")}</div>
        <button className="rounded-lg bg-primary px-4 py-2 text-white"
                onClick={() => router.push("/dashboard")}>
          {t("nav.dashboard")}
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <div className="min-h-0 flex-1">
        {scene && (
          <SceneView lessonId={lessonId} scene={scene}
                     boardHandleRef={boardHandleRef} interactive />
        )}
      </div>
      <SignalBar lessonId={lessonId} initial={state.my_signal} />
      {poll && (
        <PollModal lessonId={lessonId} poll={poll} onDone={() => setPoll(null)} />
      )}
      {pollResult && (
        <div className="fixed bottom-20 left-1/2 z-40 -translate-x-1/2 rounded-lg bg-paper-2 p-4 shadow-lg">
          <div className="mb-2 font-medium">{t("live.poll.results")}: {pollResult.question}</div>
          {pollResult.options.map((opt, i) => (
            <div key={i} className="text-sm">{opt} — {pollResult.counts[i]}</div>
          ))}
        </div>
      )}
    </div>
  );
}
```

(`nav.dashboard` — existing key; verify presence in `en.ts`, else use `t("live.backToLesson")`→ no: link goes to dashboard, add key `live.toDashboard` if missing. Check first — sidebar renders a dashboard label, reuse its key.)

- [ ] **Step 2: Sidebar auto-collapse**

In `frontend/src/app/(dashboard)/layout.tsx`, the existing collapse regex:

```ts
const isLessonPage = /\/courses\/[^/]+\/lessons\//.test(pathname);
```

extend to:

```ts
const isLessonPage = /\/courses\/[^/]+\/lessons\//.test(pathname) || /^\/lesson\//.test(pathname);
```

- [ ] **Step 3: Manual smoke** (needs backend running + a started lesson): open `/lesson/<id>` as student — blank scene renders, signal bar togglable.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/(dashboard)
git commit -m "feat(live-frontend): student live lesson page (scene, signals, polls, hints, heartbeat)"
```

---

### Task 7: Teacher panel components

**Files:**
- Create: `frontend/src/components/live/roster-panel.tsx`
- Create: `frontend/src/components/live/progress-grid.tsx`
- Create: `frontend/src/components/live/student-drawer.tsx`
- Create: `frontend/src/components/live/poll-panel.tsx`

- [ ] **Step 1: `roster-panel.tsx`** — Group tab. Seeds from `useRoster`, patched by SSE presence/signal events via props.

```tsx
"use client";

import type { RosterMember, SignalType } from "@/lib/api/live";
import { useTranslation } from "@/lib/i18n/context";

const SIGNAL_EMOJI: Record<SignalType, string> = { hand: "✋", confused: "🤔", done: "✅" };

export function RosterPanel({ members, onPick }: {
  members: RosterMember[];
  onPick: (m: RosterMember) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-1 overflow-y-auto">
      {members.map((m) => (
        <button key={m.id} onClick={() => onPick(m)}
                className="flex items-center gap-2 rounded-lg p-2 text-left hover:bg-paper-2">
          <span className={`h-2 w-2 shrink-0 rounded-full ${m.online ? "bg-success-fg" : "bg-border-strong"}`} />
          <span className="min-w-0 flex-1 truncate text-sm">{m.name}</span>
          {m.signal && <span>{SIGNAL_EMOJI[m.signal]}</span>}
          <span className="text-xs text-text-subtle">
            {m.online ? (m.current_view ?? "") : t("live.notInLesson")}
          </span>
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: `progress-grid.tsx`** — Task tab

```tsx
"use client";

import type { ProgressRow } from "@/lib/api/live";
import { useTranslation } from "@/lib/i18n/context";

export function ProgressGrid({ rows }: { rows: ProgressRow[] }) {
  const { t } = useTranslation();
  const solved = rows.filter((r) => r.passed).length;
  return (
    <div>
      <div className="mb-2 text-sm text-text-muted">{solved}/{rows.length}</div>
      <div className="flex flex-col gap-1">
        {rows.map((r) => (
          <div key={r.id} className="flex items-center gap-2 rounded-lg bg-surface-2 p-2 text-sm">
            <span className="min-w-0 flex-1 truncate">{r.name}</span>
            <span className="text-xs text-text-subtle">{r.attempts} {t("live.attempts")}</span>
            <span>
              {r.passed ? "✅" : r.submitted ? "❌" : r.draft_updated_at ? "✏️" : "·"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: `student-drawer.tsx`** — click a student: submissions/draft peek + hint box. Draft polling (3–5 s conditional GET) included for forward-compat; shows "—" while no draft exists (see scope note).

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { fetchDraft, sendHint, type Draft, type RosterMember } from "@/lib/api/live";
import { useTranslation } from "@/lib/i18n/context";

export function StudentDrawer({ lessonId, member, exerciseId, onClose }: {
  lessonId: string;
  member: RosterMember;
  exerciseId: string | null; // current task scene's exercise
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [hint, setHint] = useState("");
  const etagRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!exerciseId) return;
    let stop = false;
    const tick = async () => {
      const d = await fetchDraft(exerciseId, member.id, etagRef.current);
      if (stop) return;
      if (d) { etagRef.current = d.updated_at; setDraft(d); }
    };
    void tick();
    const iv = setInterval(() => void tick(), 4000);
    return () => { stop = true; clearInterval(iv); };
  }, [exerciseId, member.id]);

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-96 border-l border-border bg-paper-2 p-4 shadow-lg">
      <div className="mb-4 flex items-center justify-between">
        <div className="font-semibold">{member.name}</div>
        <button onClick={onClose} className="text-text-muted">✕</button>
      </div>
      <div className="mb-2 text-sm font-medium">{t("live.draft")}</div>
      {draft ? (
        <pre className="max-h-64 overflow-auto rounded-lg bg-surface-2 p-3 font-mono text-xs">
          {draft.source_code ?? JSON.stringify(draft.answers, null, 2)}
        </pre>
      ) : (
        <div className="text-sm text-text-subtle">—</div>
      )}
      <div className="mt-6">
        <textarea value={hint} onChange={(e) => setHint(e.target.value)}
                  placeholder={t("live.hint.placeholder")}
                  className="w-full rounded-lg border border-border bg-surface-2 p-2 text-sm"
                  rows={3} />
        <button
          disabled={!hint.trim()}
          onClick={async () => {
            await sendHint(lessonId, member.id, hint.trim());
            setHint("");
            toast.success(t("live.hint.send"));
          }}
          className="mt-2 w-full rounded-lg bg-primary p-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {t("live.hint.send")}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: `poll-panel.tsx`** — Poll tab

```tsx
"use client";

import { useState } from "react";

import { closePoll, startPoll, type PollResult } from "@/lib/api/live";
import { useTranslation } from "@/lib/i18n/context";

export function PollPanel({ lessonId, liveCounts }: {
  lessonId: string;
  liveCounts: number[] | null; // fed from SSE poll_progress
}) {
  const { t } = useTranslation();
  const [question, setQuestion] = useState("");
  const [optionsText, setOptionsText] = useState("");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<PollResult | null>(null);

  const options = optionsText.split("\n").map((s) => s.trim()).filter(Boolean);

  if (running) {
    return (
      <div>
        <div className="mb-2 font-medium">{question}</div>
        {options.map((opt, i) => (
          <div key={i} className="mb-1 text-sm">
            {opt} — {liveCounts?.[i] ?? 0}
          </div>
        ))}
        <button
          onClick={async () => { setResult(await closePoll(lessonId)); setRunning(false); }}
          className="mt-3 w-full rounded-lg bg-danger p-2 text-sm font-medium text-white"
        >
          {t("live.poll.close")}
        </button>
      </div>
    );
  }
  return (
    <div>
      {result && (
        <div className="mb-4 rounded-lg bg-surface-2 p-3 text-sm">
          <div className="mb-1 font-medium">{t("live.poll.results")}</div>
          {result.options.map((opt, i) => (
            <div key={i}>{opt} — {result.counts[i]}</div>
          ))}
        </div>
      )}
      <label className="mb-1 block text-sm">{t("live.poll.question")}</label>
      <input value={question} onChange={(e) => setQuestion(e.target.value)}
             className="mb-2 w-full rounded-lg border border-border bg-surface-2 p-2 text-sm" />
      <label className="mb-1 block text-sm">{t("live.poll.options")}</label>
      <textarea value={optionsText} onChange={(e) => setOptionsText(e.target.value)} rows={4}
                className="w-full rounded-lg border border-border bg-surface-2 p-2 text-sm" />
      <button
        disabled={!question.trim() || options.length < 2}
        onClick={async () => {
          await startPoll(lessonId, question.trim(), options);
          setResult(null);
          setRunning(true);
        }}
        className="mt-2 w-full rounded-lg bg-primary p-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {t("live.poll.start")}
      </button>
    </div>
  );
}
```

- [ ] **Step 5: Typecheck** — `npx tsc --noEmit` clean. **Step 6: Commit**

```bash
git add frontend/src/components/live
git commit -m "feat(live-frontend): teacher panel components (roster, progress, drawer, poll)"
```

---

### Task 8: Teacher page — `(admin)/admin/live/[lessonId]/page.tsx`

**Files:**
- Create: `frontend/src/app/(admin)/admin/live/[lessonId]/page.tsx`
- Create: `frontend/src/components/live/material-picker.tsx`
- Create: `frontend/src/components/live/exercise-picker.tsx`

Layout A: left scene rail (48px icons) · center stage · right panel (w-80, tabs Group/Task/Poll). Top bar: timer, online count, follow-mode toggle, Projector, End.

- [ ] **Step 1: Pickers.** Both reuse existing APIs: course tree via `apiClient.get("/courses/" + courseId)` (modules+lessons come with the course detail — verify the exact shape in `src/lib/api/courses.ts` / the course edit page and adapt field names), exercises via `exercisesApi.getByLesson(lessonId)` from `@/lib/api/exercises`.

`material-picker.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";

import apiClient from "@/lib/api-client";
import { useTranslation } from "@/lib/i18n/context";

interface LessonRow { id: string; title: string }
interface ModuleRow { id: string; title: string; lessons: LessonRow[] }

export function MaterialPicker({ courseId, onPick }: {
  courseId: string;
  onPick: (lessonId: string) => void;
}) {
  const { t } = useTranslation();
  const [modules, setModules] = useState<ModuleRow[]>([]);
  useEffect(() => {
    let cancelled = false;
    void apiClient.get(`/courses/${courseId}`).then(({ data }) => {
      if (!cancelled) setModules((data.modules ?? []) as ModuleRow[]);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [courseId]);
  return (
    <div className="p-4">
      <div className="mb-2 font-medium">{t("live.pickMaterial")}</div>
      {modules.map((m) => (
        <div key={m.id} className="mb-3">
          <div className="mb-1 text-sm text-text-muted">{m.title}</div>
          {m.lessons.map((l) => (
            <button key={l.id} onClick={() => onPick(l.id)}
                    className="block w-full rounded-lg p-2 text-left text-sm hover:bg-paper-2">
              {l.title}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
```

`exercise-picker.tsx` (same shape; `onPick(exercise)` gets the full exercise object so the stage can also show a demo):

```tsx
"use client";

import { useEffect, useState } from "react";

import { exercisesApi } from "@/lib/api/exercises";
import { useTranslation } from "@/lib/i18n/context";

interface ExerciseRow { id: string; title: string; exercise_type: string }

export function ExercisePicker({ lessonRowId, onPick }: {
  lessonRowId: string; // course lesson id
  onPick: (ex: ExerciseRow) => void;
}) {
  const { t } = useTranslation();
  const [items, setItems] = useState<ExerciseRow[]>([]);
  useEffect(() => {
    let cancelled = false;
    void exercisesApi.getByLesson(lessonRowId).then((resp) => {
      if (!cancelled) setItems((resp.data ?? []) as ExerciseRow[]);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [lessonRowId]);
  return (
    <div className="p-4">
      <div className="mb-2 font-medium">{t("live.pickExercise")}</div>
      {items.map((ex) => (
        <button key={ex.id} onClick={() => onPick(ex)}
                className="block w-full rounded-lg p-2 text-left text-sm hover:bg-paper-2">
          {ex.title} <span className="text-xs text-text-subtle">({ex.exercise_type})</span>
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: The page**

```tsx
"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { BoardEditor } from "@/components/live/board-editor";
import { ExercisePicker } from "@/components/live/exercise-picker";
import { MaterialPicker } from "@/components/live/material-picker";
import { PollPanel } from "@/components/live/poll-panel";
import { ProgressGrid } from "@/components/live/progress-grid";
import { RosterPanel } from "@/components/live/roster-panel";
import { StudentDrawer } from "@/components/live/student-drawer";
import {
  createBoard, endLesson, sendHeartbeat, setFollowMode,
  useLessonState, useProgress, useRoster, useSetScene,
  type RosterMember, type Scene,
} from "@/lib/api/live";
import { useLessonChannel } from "@/hooks/use-lesson-channel";
import { useTranslation } from "@/lib/i18n/context";

type Rail = "blank" | "board" | "material" | "task" | "solution";

export default function TeacherLivePage() {
  const { t } = useTranslation();
  const router = useRouter();
  const qc = useQueryClient();
  const { lessonId } = useParams<{ lessonId: string }>();

  const { data: state } = useLessonState(lessonId);
  const lesson = state?.lesson;
  const [rail, setRail] = useState<Rail>("blank");
  const [tab, setTab] = useState<"group" | "task" | "poll">("group");
  const [picked, setPicked] = useState<RosterMember | null>(null);
  const [pollCounts, setPollCounts] = useState<number[] | null>(null);
  const [members, setMembers] = useState<RosterMember[]>([]);
  const setSceneMut = useSetScene(lessonId);

  const currentScene = lesson?.current_scene ?? null;
  const taskExerciseId = currentScene?.type === "task"
    ? (currentScene.payload.exercise_id as string) : null;

  const { data: rosterData } = useRoster(lessonId, !!lesson);
  useEffect(() => {
    if (rosterData) setMembers(rosterData.members);
  }, [rosterData]);

  const { data: progressData } = useProgress(lessonId, taskExerciseId);

  useLessonChannel(lesson?.status === "active" ? lessonId : null, {
    onPresence: (p) => setMembers((ms) => ms.map((m) =>
      m.id === p.student_id
        ? { ...m, online: p.online, current_view: p.view, exercise_id: p.exercise_id }
        : m)),
    onSignal: (s) => setMembers((ms) => ms.map((m) =>
      m.id === s.student_id ? { ...m, signal: s.on ? s.type : null } : m)),
    onSubmission: () => {
      void qc.invalidateQueries({ queryKey: ["live", lessonId, "progress"] });
    },
    onPollProgress: (p) => setPollCounts(p.counts),
    onLessonEnded: () => router.refresh(),
  });

  // teacher heartbeat keeps the lesson alive (stale auto-end guard)
  useEffect(() => {
    if (lesson?.status !== "active") return;
    const iv = setInterval(() => void sendHeartbeat(lessonId, "teacher"), 5000);
    return () => clearInterval(iv);
  }, [lessonId, lesson?.status]);

  const onlineCount = useMemo(() => members.filter((m) => m.online).length, [members]);

  if (!lesson) return null;

  const switchToBoard = async () => {
    // one main board per lesson v1: reuse from scene payload or create
    if (currentScene?.type === "board") return;
    const board = await createBoard(lessonId, "board");
    await setSceneMut.mutateAsync({ type: "board", payload: { board_id: board.id } });
    setRail("board");
  };

  const railBtn = (key: Rail, emoji: string, label: string, onClick?: () => void) => (
    <button key={key} title={label}
            onClick={onClick ?? (() => setRail(key))}
            className={`flex h-11 w-11 items-center justify-center rounded-lg text-xl ${
              rail === key ? "bg-primary text-white" : "bg-surface-2 hover:bg-paper-2"
            }`}>
      {emoji}
    </button>
  );

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {/* top bar */}
      <div className="flex items-center gap-3 border-b border-border bg-paper-2 px-4 py-2">
        <span className="font-semibold">{t("live.lesson")}</span>
        <LessonTimer startedAt={lesson.created_at} />
        <span className="text-sm text-text-muted">🟢 {onlineCount} {t("live.online")}</span>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => void setFollowMode(lessonId,
              lesson.follow_mode === "free" ? "strict" : "free")
              .then(() => qc.invalidateQueries({ queryKey: ["live", lessonId, "state"] }))}
            className="rounded-pill bg-surface-2 px-3 py-1 text-sm"
          >
            {lesson.follow_mode === "strict" ? t("live.followMode.strict") : t("live.followMode.free")}
          </button>
          <button
            onClick={() => window.open(`/admin/live/${lessonId}/screen`, "_blank", "noopener,noreferrer")}
            className="rounded-pill bg-surface-2 px-3 py-1 text-sm"
          >
            🖥 {t("live.projector")}
          </button>
          <button
            onClick={async () => {
              if (!confirm(t("live.endConfirm"))) return;
              await endLesson(lessonId);
              router.push("/admin/groups");
            }}
            className="rounded-pill bg-danger px-3 py-1 text-sm font-medium text-white"
          >
            {t("live.end")}
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* scene rail */}
        <div className="flex flex-col gap-2 border-r border-border bg-paper-2 p-2">
          {railBtn("blank", "⬜", t("live.scene.blank"),
            () => { setRail("blank"); void setSceneMut.mutateAsync({ type: "blank", payload: {} }); })}
          {railBtn("board", "🖊", t("live.scene.board"), () => void switchToBoard())}
          {railBtn("material", "📖", t("live.scene.material"))}
          {railBtn("task", "🧩", t("live.scene.task"))}
          {railBtn("solution", "🔍", t("live.scene.solution"))}
        </div>

        {/* stage */}
        <div className="min-w-0 flex-1">
          {rail === "board" && currentScene?.type === "board" && (
            <BoardEditor lessonId={lessonId}
                         boardId={currentScene.payload.board_id as string} />
          )}
          {rail === "material" && (
            lesson.course_id ? (
              <MaterialPicker courseId={lesson.course_id}
                onPick={(materialLessonId) => {
                  void setSceneMut.mutateAsync({
                    type: "material", payload: { lesson_id: materialLessonId },
                  });
                }} />
            ) : <div className="p-6 text-text-muted">—</div>
          )}
          {rail === "task" && currentScene?.type === "material" && (
            <ExercisePicker lessonRowId={currentScene.payload.lesson_id as string}
              onPick={(ex) => {
                void setSceneMut.mutateAsync({
                  type: "task", payload: { exercise_id: ex.id, title: ex.title },
                });
              }} />
          )}
          {rail === "task" && currentScene?.type === "task" && (
            <div className="flex h-full items-center justify-center text-xl text-text-muted">
              🧩 {String(currentScene.payload.title ?? "")}
            </div>
          )}
          {rail === "task" && currentScene?.type !== "material" && currentScene?.type !== "task" && (
            <div className="p-6 text-sm text-text-muted">{t("live.pickMaterial")}</div>
          )}
          {rail === "solution" && (
            <SolutionSetup lessonId={lessonId} members={members}
                           exerciseId={taskExerciseId}
                           onSet={(scene) => void setSceneMut.mutateAsync(scene)} />
          )}
          {rail === "blank" && (
            <div className="flex h-full items-center justify-center text-2xl text-text-subtle">⬜</div>
          )}
        </div>

        {/* right panel */}
        <div className="flex w-80 flex-col border-l border-border bg-paper-2">
          <div className="flex border-b border-border">
            {(["group", "task", "poll"] as const).map((k) => (
              <button key={k} onClick={() => setTab(k)}
                      className={`flex-1 p-2 text-sm ${tab === k ? "border-b-2 border-primary font-medium" : "text-text-muted"}`}>
                {t(`live.tab.${k}`)}
              </button>
            ))}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {tab === "group" && <RosterPanel members={members} onPick={setPicked} />}
            {tab === "task" && (progressData
              ? <ProgressGrid rows={progressData.students} />
              : <div className="text-sm text-text-subtle">{t("live.pickExercise")}</div>)}
            {tab === "poll" && <PollPanel lessonId={lessonId} liveCounts={pollCounts} />}
          </div>
        </div>
      </div>

      {picked && (
        <StudentDrawer lessonId={lessonId} member={picked}
                       exerciseId={taskExerciseId} onClose={() => setPicked(null)} />
      )}
    </div>
  );
}

function LessonTimer({ startedAt }: { startedAt: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(iv);
  }, []);
  const secs = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000));
  const mm = String(Math.floor(secs / 60)).padStart(2, "0");
  const ss = String(secs % 60).padStart(2, "0");
  return <span className="font-mono text-sm text-text-muted">⏱ {mm}:{ss}</span>;
}

function SolutionSetup({ lessonId, members, exerciseId, onSet }: {
  lessonId: string;
  members: { id: string; name: string }[];
  exerciseId: string | null;
  onSet: (scene: Scene) => void;
}) {
  const { t } = useTranslation();
  const [anonymous, setAnonymous] = useState(true);
  if (!exerciseId) {
    return <div className="p-6 text-sm text-text-muted">{t("live.pickExercise")}</div>;
  }
  return (
    <div className="p-6">
      <label className="mb-3 flex items-center gap-2 text-sm">
        <input type="checkbox" checked={anonymous}
               onChange={(e) => setAnonymous(e.target.checked)} />
        {t("live.anonymous")}
      </label>
      {members.map((m) => (
        <button key={m.id}
                onClick={() => onSet({
                  type: "solution",
                  payload: { exercise_id: exerciseId, student_id: m.id, anonymous },
                })}
                className="block w-full rounded-lg p-2 text-left text-sm hover:bg-paper-2">
          {t("live.showSolution")}: {m.name}
        </button>
      ))}
    </div>
  );
}
```

Simplifications (deliberate, `ponytail`-style): one main board per lesson (annotation boards ride the same mechanism later via `createBoard(lessonId, "annotation", ref)`); the task rail requires picking a material lesson first (that's where exercises live); solution scene sends `student_id + exercise_id` (backend prefers submission when told — extend the drawer later to pick a specific submission).

- [ ] **Step 3: Typecheck** — `npx tsc --noEmit`. **Step 4: Commit**

```bash
git add frontend/src/app/(admin)/admin/live frontend/src/components/live
git commit -m "feat(live-frontend): teacher live screen (layout A: rail + stage + group panel)"
```

---

### Task 9: Projector window + entry points + review mode + student banner

**Files:**
- Create: `frontend/src/app/(admin)/admin/live/[lessonId]/screen/page.tsx`
- Modify: `frontend/src/app/(admin)/layout.tsx` (chrome-free branch for `/screen`)
- Create: `frontend/src/components/live/start-lesson-button.tsx`
- Modify: `frontend/src/app/(admin)/admin/groups/page.tsx` (mount the button per group row)
- Create: `frontend/src/components/live/live-lesson-banner.tsx`
- Modify: `frontend/src/app/(dashboard)/layout.tsx` (mount banner)

- [ ] **Step 1: Projector page** — clean stage, own SSE, no interaction

```tsx
"use client";

import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { SceneView } from "@/components/live/scene-view";
import type { BoardViewHandle } from "@/components/live/board-view";
import { useLessonState, type Scene } from "@/lib/api/live";
import { useLessonChannel } from "@/hooks/use-lesson-channel";
import { useTranslation } from "@/lib/i18n/context";

export default function ProjectorPage() {
  const { t } = useTranslation();
  const { lessonId } = useParams<{ lessonId: string }>();
  const { data: state } = useLessonState(lessonId);
  const [scene, setScene] = useState<Scene | null>(null);
  const [ended, setEnded] = useState(false);
  const boardHandleRef = useRef<BoardViewHandle | null>(null);

  useEffect(() => {
    if (state) setScene(state.lesson.current_scene);
  }, [state]);

  useLessonChannel(ended ? null : lessonId, {
    onSceneChanged: setScene,
    onBoardDelta: (d) => boardHandleRef.current?.applyRemoteDelta(d),
    onLessonEnded: () => setEnded(true),
  });

  if (ended) {
    return <div className="flex h-screen items-center justify-center text-3xl">{t("live.endedTitle")}</div>;
  }
  return (
    <div className="h-screen w-screen bg-white">
      {scene && (
        <SceneView lessonId={lessonId} scene={scene}
                   boardHandleRef={boardHandleRef} interactive={false} />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Chrome-free branch.** In `(admin)/layout.tsx`, next to its auth logic, add an early return BEFORE rendering sidebar chrome:

```ts
const isProjector = /^\/admin\/live\/[^/]+\/screen$/.test(pathname);
if (isProjector) return <>{children}</>;
```

(Keep the auth gate above this line — projector must still require a logged-in staff session.)

- [ ] **Step 3: `start-lesson-button.tsx`**

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { getApiError } from "@/lib/api-client";
import { startLesson } from "@/lib/api/live";
import { useTranslation } from "@/lib/i18n/context";

export function StartLessonButton({ groupId }: { groupId: string }) {
  const { t } = useTranslation();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          const lesson = await startLesson(groupId);
          router.push(`/admin/live/${lesson.id}`);
        } catch (err: unknown) {
          const detail = (err as { response?: { status?: number; data?: { detail?: { active_lesson_id?: string } } } }).response;
          if (detail?.status === 409 && detail.data?.detail?.active_lesson_id) {
            router.push(`/admin/live/${detail.data.detail.active_lesson_id}`);
          } else {
            toast.error(getApiError(err, t("live.start")));
            setBusy(false);
          }
        }
      }}
      className="rounded-pill bg-primary px-3 py-1 text-sm font-medium text-white disabled:opacity-50"
    >
      ▶ {t("live.start")}
    </button>
  );
}
```

409 → navigate into the already-running lesson (the "продолжить" path).

- [ ] **Step 4: Mount in groups page.** In `frontend/src/app/(admin)/admin/groups/page.tsx`, locate the per-group row/card render (the list the page maps over) and add `<StartLessonButton groupId={g.id} />` into its actions area (next to existing edit buttons; match the local variable name for the group row). This is the primary teacher entry point; journal-slot entry is a follow-up.

- [ ] **Step 5: Student banner** — `live-lesson-banner.tsx`, mounted once in `(dashboard)/layout.tsx` above `{children}`:

```tsx
"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { fetchActiveLesson } from "@/lib/api/live";
import { useTranslation } from "@/lib/i18n/context";

export function LiveLessonBanner() {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const [lessonId, setLessonId] = useState<string | null>(null);

  useEffect(() => {
    // one check per page load — deliberately NOT an interval (spec §9)
    void fetchActiveLesson().then(setLessonId).catch(() => {});
  }, [pathname]);

  if (!lessonId || pathname.startsWith("/lesson/")) return null;
  return (
    <div className="flex items-center justify-between gap-3 bg-primary px-4 py-2 text-sm text-white">
      <span>🔴 {t("live.joinBanner")}</span>
      <button onClick={() => router.push(`/lesson/${lessonId}`)}
              className="rounded-pill bg-white/20 px-3 py-1 font-medium">
        {t("live.join")}
      </button>
    </div>
  );
}
```

- [ ] **Step 6: Review mode (ended lesson).** The student page already renders an "ended" screen; extend BOTH pages minimally: when `lesson.status === "ended"`, render summary blocks instead of live UI — boards list (each opens `BoardView` read-only), `summary.scenes` timeline, `summary.last_poll`/poll entries from `scenes`. Implementation: add `frontend/src/components/live/lesson-review.tsx`:

```tsx
"use client";

import { useRef, useState } from "react";

import { BoardView, type BoardViewHandle } from "@/components/live/board-view";
import type { LiveLesson } from "@/lib/api/live";
import { useTranslation } from "@/lib/i18n/context";

export function LessonReview({ lesson, boardIds }: { lesson: LiveLesson; boardIds: string[] }) {
  const { t } = useTranslation();
  const [openBoard, setOpenBoard] = useState<string | null>(boardIds[0] ?? null);
  const handleRef = useRef<BoardViewHandle | null>(null);
  const scenes = (lesson.summary?.scenes ?? []) as { type: string; at: string }[];

  return (
    <div className="p-6">
      <h1 className="mb-4 text-xl font-semibold">{t("live.review")}</h1>
      <div className="mb-4 flex gap-2">
        {boardIds.map((id, i) => (
          <button key={id} onClick={() => setOpenBoard(id)}
                  className={`rounded-pill px-3 py-1 text-sm ${openBoard === id ? "bg-primary text-white" : "bg-surface-2"}`}>
            {t("live.scene.board")} {i + 1}
          </button>
        ))}
      </div>
      {openBoard && (
        <div className="h-[60vh] rounded-lg border border-border">
          <BoardView lessonId={lesson.id} boardId={openBoard} handleRef={handleRef} />
        </div>
      )}
      <div className="mt-6">
        {scenes.map((s, i) => (
          <div key={i} className="text-sm text-text-muted">
            {new Date(s.at).toLocaleTimeString()} — {t(`live.scene.${s.type}` as never) || s.type}
          </div>
        ))}
      </div>
    </div>
  );
}
```

Board ids for review: add `board_ids: string[]` to the backend `LessonStateResponse` (one `select(LessonBoard.id)` — tiny Plan 1 amendment, add it while implementing Task 4/5 of Plan 1 or as a follow-up patch there) OR skip the boards strip and only show the timeline v1. Pick the backend amendment — one query, one schema field.

- [ ] **Step 7: Typecheck + full vitest**

Run: `npx tsc --noEmit && npx vitest run`
Expected: clean; the i18n ratchet test passes because every new `.tsx` calls `useTranslation()`.

- [ ] **Step 8: Commit**

```bash
git add frontend/src
git commit -m "feat(live-frontend): projector window, start button, student banner, lesson review"
```

---

### Task 10: Playwright e2e + final checks

**Files:**
- Create: `frontend/e2e/live-lesson.spec.ts`

- [ ] **Step 1: Write the spec** (needs backend + frontend running; uses the QA roles from `e2e/poms/LoginPage.ts` — requires a seeded group containing the qa-student with qa-teacher as teacher; check `scripts/` seed used by the QA system (memory: qa-workflow) and reuse; if the standard seed lacks a group, create it via the admin UI in the test or extend the seed)

```ts
import { expect, test } from "@playwright/test";

import { LoginPage } from "./poms/LoginPage";

test.describe("live lesson", () => {
  test("teacher starts, student joins, scene syncs, lesson ends", async ({ browser }) => {
    const teacherCtx = await browser.newContext();
    const studentCtx = await browser.newContext();
    const teacherPage = await teacherCtx.newPage();
    const studentPage = await studentCtx.newPage();

    await new LoginPage(teacherPage).loginViaUi("teacher");
    await new LoginPage(studentPage).loginViaUi("student");

    // teacher: start from groups page
    await teacherPage.goto("/admin/groups");
    await teacherPage.getByRole("button", { name: /начать урок|start lesson/i }).first().click();
    await teacherPage.waitForURL(/\/admin\/live\//);
    const lessonUrl = teacherPage.url();
    const lessonId = lessonUrl.split("/admin/live/")[1];

    // student: join via direct URL (banner needs a reload cycle; direct is deterministic)
    await studentPage.goto(`/lesson/${lessonId}`);
    await expect(studentPage.getByText(/✋/)).toBeVisible();

    // teacher switches scene to board -> student sees excalidraw canvas
    await teacherPage.getByTitle(/доска|board/i).click();
    await expect(studentPage.locator(".excalidraw")).toBeVisible({ timeout: 10000 });

    // student raises hand -> teacher sees it
    await studentPage.getByRole("button", { name: /✋/ }).click();
    await expect(teacherPage.getByText("✋")).toBeVisible({ timeout: 10000 });

    // end lesson
    teacherPage.on("dialog", (d) => void d.accept());
    await teacherPage.getByRole("button", { name: /завершить|end lesson/i }).click();
    await expect(studentPage.getByText(/урок завершён|lesson ended/i)).toBeVisible({ timeout: 10000 });

    await teacherCtx.close();
    await studentCtx.close();
  });
});
```

- [ ] **Step 2: Run locally**

```bash
# terminal 1: cd backend && uvicorn app.main:app
# terminal 2: cd frontend && npm run dev
cd frontend && npx playwright test e2e/live-lesson.spec.ts
```

Expected: PASS. Fix selector drift against the real DOM as needed (roles/names above match the components from Tasks 6-9).

- [ ] **Step 3: Full gates**

```bash
cd frontend && npx tsc --noEmit && npx vitest run && npm run lint && npm run build
```

Expected: all clean. `npm run build` matters — dynamic imports + "use client" pages must compile in production mode.

- [ ] **Step 4: Commit**

```bash
git add frontend/e2e/live-lesson.spec.ts
git commit -m "test(live-frontend): e2e happy path (start, join, scene sync, signal, end)"
```

---

### Task 11: Draft capture for current live types (`onAnswersChange`)

**Files:**
- Modify: `frontend/src/components/exercises/v2/true-false-v2.tsx`
- Modify: `frontend/src/components/exercises/v2/fill-blanks-v2.tsx`
- Modify: `frontend/src/components/exercises/v2/ordering-v2.tsx`
- Modify: `frontend/src/components/exercises/v2-exercise-live.tsx`
- Modify: `frontend/src/components/live/scene-view.tsx` (TaskPane)

- [ ] **Step 1:** In each of the three V2 components, add an optional prop `onAnswersChange?: (answers: unknown) => void` and call it wherever the component updates its internal answer state (the same value it would pass to `onGrade`): true_false — on choice select; fill_blanks — on each blank placement; ordering — on each reorder. Read each component first; the callback goes right next to the existing `setState` of the answer.

- [ ] **Step 2:** Thread through `V2ExerciseLive`: add `onAnswersChange` to `V2ExerciseLiveProps`, include it in the `shared` object passed to all three components.

- [ ] **Step 3:** In `SceneView`'s `TaskPane` (student, `interactive` mode), wire throttled draft saving:

```tsx
const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
const lastSent = useRef<string>("");

const handleAnswers = (answers: unknown) => {
  if (draftTimer.current) return;
  draftTimer.current = setTimeout(() => {
    draftTimer.current = null;
    const body = JSON.stringify(answers);
    if (body === lastSent.current) return; // dirty-check
    lastSent.current = body;
    void saveDraft(exerciseId, answers as Record<string, unknown>);
  }, 7000);
};
// <V2ExerciseLive exercise={...} onAnswersChange={handleAnswers} />
```

(`saveDraft` from `@/lib/api/live`; import `useRef`.)

- [ ] **Step 4:** `npx tsc --noEmit && npx vitest run` clean; manual check: student drags words in fill_blanks → teacher drawer shows the partial arrangement within ~10 s.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components
git commit -m "feat(live-frontend): draft capture from V2 live exercises (throttled, dirty-checked)"
```

---

## Follow-up milestone (Plan 3, scheduled right after Plans 1+2 ship): full exercise-type coverage in live player

Owner decision 2026-07-23: all 24 exercise types must work in the live `task` scene; base ships first, this follows immediately. Plan 3 gets written after the base is implemented, starting with an investigation task:

- **Path A (preferred, investigate first):** reuse the EXISTING per-type student players from the regular lesson page (`(dashboard)/courses/[courseId]/lessons/[lessonId]`) inside the live task scene — every type already renders and submits there today; live mode may only need mount + submit-hook compatibility (the backend submit hook from Plan 1 is type-agnostic already).
- **Path B (where A doesn't fit):** extend `V2_LIVE_TYPES` per type — backend `_strip_answers` support + `V2ExerciseLive` prop mapping per type (the current 3-type pattern).
- **code_challenge** rides Path A (Monaco player + sandbox grading already work in the normal flow) and is the biggest peek/draft payoff — `onAnswersChange`/draft wiring for it lands in the same plan.
- Draft capture per type follows whichever path the type takes (Task 11's mechanism is the template).

## Plan self-review notes (done at write time)

- **Spec coverage:** teacher layout A §9 ✓ (T8), student screen §9 ✓ (T6), projector §9 ✓ (T9), entry via groups + banner §9 ✓ (T9; journal-slot button deferred, noted), board sync §8 ✓ (T4), materials §4 ✓ (T5), task assign §4/§9 ✓ (T5/T8), solution §4 ✓ (T5/T8), signals+polls §7 ✓ (T5/T7), hints §6 ✓ (T7), review mode §10 ✓ (T9), heartbeat/presence §6 ✓ (T6/T8), i18n ratchet ✓ (T3, every component calls useTranslation).
- **Known deviations, all flagged inline:** (1) draft capture not wired into V2 player (types don't expose answers; backend ready); (2) global free-mode heartbeat outside the lesson page deferred — presence shows "not in lesson" when the student leaves the page, which is honest v1 behavior; (3) journal-slot entry point deferred to follow-up; (4) annotation-over-material UI deferred (mechanism present: `kind: "annotation"` + SceneView overlay branch); (5) `board_ids` needs the tiny Plan 1 state-response amendment.
- **Type consistency:** `Scene`, `BoardDelta`, envelope event names match Plan 1's SSE events one-to-one (`EVENT_NAMES` list vs backend publish calls).
- **Verify-before-wiring points called out inline:** `_silentError` flag name, course-detail modules shape, single-exercise GET path, `common.loading`/`nav.dashboard` key existence.



