import apiClient from "@/lib/api-client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

// ---------- types (mirror backend live_lessons schemas) ----------

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
  board_ids: string[];
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

export async function setFollowMode(
  lessonId: string,
  follow_mode: FollowMode,
): Promise<LiveLesson> {
  const { data } = await apiClient.patch<LiveLesson>(`/live-lessons/${lessonId}/settings`, {
    follow_mode,
  });
  return data;
}

export async function createBoard(
  lessonId: string,
  kind: "board" | "annotation",
  materialRef?: string,
): Promise<Board> {
  const { data } = await apiClient.post<Board>(`/live-lessons/${lessonId}/boards`, {
    kind,
    material_ref: materialRef ?? null,
  });
  return data;
}

export async function fetchBoard(lessonId: string, boardId: string): Promise<Board> {
  const { data } = await apiClient.get<Board>(`/live-lessons/${lessonId}/boards/${boardId}`);
  return data;
}

export async function sendBoardDelta(
  lessonId: string,
  boardId: string,
  delta: BoardDelta,
): Promise<Board> {
  const { data } = await apiClient.patch<Board>(
    `/live-lessons/${lessonId}/boards/${boardId}`,
    delta,
  );
  return data;
}

export async function sendHeartbeat(lessonId: string, currentView: string, exerciseId?: string) {
  await apiClient.post(
    `/live-lessons/${lessonId}/heartbeat`,
    { current_view: currentView, exercise_id: exerciseId ?? null },
    { _silentError: true } as object,
  );
}

export async function fetchRoster(lessonId: string): Promise<{ members: RosterMember[] }> {
  const { data } = await apiClient.get(`/live-lessons/${lessonId}/roster`);
  return data;
}

export async function fetchProgress(
  lessonId: string,
  exerciseId: string,
): Promise<{ students: ProgressRow[] }> {
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

export async function startPoll(
  lessonId: string,
  question: string,
  options: string[],
): Promise<Poll> {
  const { data } = await apiClient.post<Poll>(`/live-lessons/${lessonId}/polls`, {
    question,
    options,
  });
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

export async function saveDraft(
  exerciseId: string,
  answers: Record<string, unknown> | null,
  sourceCode?: string,
) {
  await apiClient.post(
    `/exercises/${exerciseId}/draft`,
    { answers, source_code: sourceCode ?? null },
    { _silentError: true } as object,
  );
}

export async function fetchDraft(
  exerciseId: string,
  studentId: string,
  etag?: string,
): Promise<Draft | null> {
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
      qc.setQueryData<LessonState>(["live", lessonId, "state"], (old) =>
        old ? { ...old, lesson } : old,
      );
    },
  });
}
