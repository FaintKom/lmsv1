/**
 * Typed wrappers + TanStack Query hooks around the Phase C pacing + curriculum
 * endpoints (/api/v1/journal/pacing, /api/v1/curriculum).
 *
 * Pacing = plan (a course's curriculum scope & sequence) vs actual (the topics
 * a group's held sessions really covered). Response shapes mirror the backend
 * app/journal/pacing_service.py + app/curriculum/router.py.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import apiClient from "@/lib/api-client";

export type PacingBadge = "ontrack" | "behind" | "ahead";

export interface PacingBoardGroup {
  group_id: string;
  group_name: string;
  course_id: string | null;
  course_title: string;
  teacher_name: string;
  default_room_name: string;
  covered: number;
  total: number;
  progress: number;
  planned_today_pos: number;
  delta: number;
  badge: PacingBadge;
  next_topic_title: string | null;
  next_topic_position: number | null;
  current_topic_id: string | null;
}

export interface PacingBoardResponse {
  groups: PacingBoardGroup[];
  kpis: { ontrack: number; behind: number; ahead: number };
}

export type TimelineTopicState = "covered" | "current" | "next" | "ahead";

export interface PacingTimelineTopic {
  id: string;
  position: number;
  title: string;
  planned_lessons: number;
  target_date: string | null;
  covered_date: string | null;
  state: TimelineTopicState;
}

export interface PacingTimelineResponse {
  group_id: string;
  group_name: string;
  course_id: string;
  course_title: string;
  covered: number;
  total: number;
  covered_lessons: number;
  total_lessons: number;
  held_sessions: number;
  current_topic_title: string | null;
  delta: number;
  badge: PacingBadge;
  today_fraction: number;
  topics: PacingTimelineTopic[];
}

export interface CurriculumTopic {
  id: string;
  course_id: string;
  position: number;
  title: string;
  planned_lessons: number;
  target_date: string | null;
}

export interface CurriculumResponse {
  course_id: string;
  course_title: string;
  topics: CurriculumTopic[];
}

export interface TopicCreate {
  course_id: string;
  title: string;
  planned_lessons?: number;
  target_date?: string | null;
}

export interface TopicUpdate {
  title?: string;
  planned_lessons?: number;
  target_date?: string | null;
  position?: number;
}

// ── Raw API functions ──────────────────────────────────────────────────

export async function fetchPacingBoard(): Promise<PacingBoardResponse> {
  const { data } = await apiClient.get<PacingBoardResponse>("/journal/pacing");
  return data;
}

export async function fetchPacingTimeline(
  groupId: string,
): Promise<PacingTimelineResponse> {
  const { data } = await apiClient.get<PacingTimelineResponse>(
    `/journal/pacing/${groupId}`,
  );
  return data;
}

export async function fetchCurriculum(
  courseId: string,
): Promise<CurriculumResponse> {
  const { data } = await apiClient.get<CurriculumResponse>("/curriculum", {
    params: { course_id: courseId },
  });
  return data;
}

export async function createTopic(body: TopicCreate): Promise<CurriculumTopic> {
  const { data } = await apiClient.post<CurriculumTopic>("/curriculum", body);
  return data;
}

export async function updateTopic(
  topicId: string,
  body: TopicUpdate,
): Promise<CurriculumTopic> {
  const { data } = await apiClient.put<CurriculumTopic>(
    `/curriculum/${topicId}`,
    body,
  );
  return data;
}

export async function deleteTopic(topicId: string): Promise<void> {
  await apiClient.delete(`/curriculum/${topicId}`);
}

// ── Query hooks ────────────────────────────────────────────────────────

export function usePacingBoard() {
  return useQuery({
    queryKey: ["journal", "pacing", "board"],
    queryFn: fetchPacingBoard,
    staleTime: 5 * 60 * 1000,
  });
}

export function usePacingTimeline(groupId: string | null) {
  return useQuery({
    queryKey: ["journal", "pacing", "timeline", groupId],
    queryFn: () => fetchPacingTimeline(groupId as string),
    enabled: !!groupId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCurriculum(courseId: string) {
  return useQuery({
    queryKey: ["curriculum", courseId],
    queryFn: () => fetchCurriculum(courseId),
    enabled: !!courseId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateTopic(courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: TopicCreate) => createTopic(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["curriculum", courseId] });
      qc.invalidateQueries({ queryKey: ["journal", "pacing"] });
    },
  });
}

export function useUpdateTopic(courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ topicId, body }: { topicId: string; body: TopicUpdate }) =>
      updateTopic(topicId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["curriculum", courseId] });
      qc.invalidateQueries({ queryKey: ["journal", "pacing"] });
    },
  });
}

export function useDeleteTopic(courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (topicId: string) => deleteTopic(topicId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["curriculum", courseId] });
      qc.invalidateQueries({ queryKey: ["journal", "pacing"] });
    },
  });
}
