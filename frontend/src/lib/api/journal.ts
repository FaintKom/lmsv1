/**
 * Typed wrappers + TanStack Query hooks around /api/v1/journal/* endpoints.
 *
 * The class journal is a day-centric register: per (course, day) it records
 * whether the session was held + its topic, and reports what each enrolled
 * student did that day. Response shapes mirror backend app/journal/router.py.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import apiClient from "@/lib/api-client";

export interface AttendanceCounts {
  present: number;
  late: number;
  absent: number;
  excused: number;
  total: number;
}

export interface JournalSession {
  id: string;
  session_date: string;
  held: boolean;
  topic: string;
  notes: string | null;
  attendance: AttendanceCounts;
}

export interface SessionsResponse {
  course_id: string;
  course_title: string;
  sessions: JournalSession[];
}

export interface DaySessionInfo {
  id: string;
  session_date: string;
  held: boolean;
  topic: string;
  notes: string | null;
}

export interface DayActivityRow {
  student_id: string;
  student_name: string;
  lessons_completed: string[];
  exercises_done: number;
  quizzes_done: number;
  assignments_done: number;
}

export interface ScheduledSlot {
  start_time: string;
  end_time: string;
  location: string;
}

export interface DayResponse {
  session: DaySessionInfo | null;
  scheduled_slots: ScheduledSlot[];
  activity: DayActivityRow[];
}

export interface GenerateFromScheduleRequest {
  course_id: string;
  from_date: string;
  to_date: string;
}

export interface GenerateFromScheduleResponse {
  created: number;
  dates: string[];
}

export interface SessionUpsert {
  course_id: string;
  session_date: string;
  held: boolean;
  topic: string;
  notes: string | null;
}

// ── Raw API functions ──────────────────────────────────────────────────

export async function fetchSessions(
  courseId: string,
): Promise<SessionsResponse> {
  const { data } = await apiClient.get<SessionsResponse>("/journal/sessions", {
    params: { course_id: courseId },
  });
  return data;
}

export async function fetchDay(
  courseId: string,
  sessionDate: string,
): Promise<DayResponse> {
  const { data } = await apiClient.get<DayResponse>("/journal/day", {
    params: { course_id: courseId, session_date: sessionDate },
  });
  return data;
}

export async function upsertSession(
  body: SessionUpsert,
): Promise<DaySessionInfo> {
  const { data } = await apiClient.post<DaySessionInfo>(
    "/journal/sessions",
    body,
  );
  return data;
}

export async function generateFromSchedule(
  body: GenerateFromScheduleRequest,
): Promise<GenerateFromScheduleResponse> {
  const { data } = await apiClient.post<GenerateFromScheduleResponse>(
    "/journal/generate-from-schedule",
    body,
  );
  return data;
}

// ── Query hooks ────────────────────────────────────────────────────────

export function useJournalSessions(courseId: string) {
  return useQuery({
    queryKey: ["journal", "sessions", courseId],
    queryFn: () => fetchSessions(courseId),
    enabled: !!courseId,
  });
}

export function useJournalDay(courseId: string, sessionDate: string) {
  return useQuery({
    queryKey: ["journal", "day", courseId, sessionDate],
    queryFn: () => fetchDay(courseId, sessionDate),
    enabled: !!courseId && !!sessionDate,
  });
}

export function useUpsertSession(courseId: string, sessionDate: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: SessionUpsert) => upsertSession(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["journal", "sessions", courseId] });
      qc.invalidateQueries({
        queryKey: ["journal", "day", courseId, sessionDate],
      });
    },
  });
}

export function useGenerateFromSchedule(courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: GenerateFromScheduleRequest) =>
      generateFromSchedule(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["journal", "sessions", courseId] });
    },
  });
}
