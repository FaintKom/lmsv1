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
  actual_topic_id?: string | null;
  planned_topic_id?: string | null;
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
  /** Phase C: the curriculum topic actually covered (optional). */
  actual_topic_id?: string | null;
  /**
   * Phase D: the scheduling group this session belongs to. Sent so the server
   * links the session to a group on upsert and pacing reflects the mark live.
   * Optional — when omitted the backend resolves the course's default group.
   */
  group_id?: string | null;
}

export interface JournalTeacher {
  id: string;
  full_name: string;
}

export interface TodaySessionInfo {
  held: boolean;
  topic: string;
}

export interface TodayAgendaRow {
  slot_id: string;
  course_id: string;
  course_title: string;
  group_id: string | null;
  group_name: string | null;
  teacher_id: string | null;
  teacher_name: string;
  start_time: string;
  end_time: string;
  is_online: boolean;
  room_id: string | null;
  room_name: string | null;
  room_url: string | null;
  session: TodaySessionInfo | null;
  attendance: { present: number; total: number };
}

export interface TodayResponse {
  date: string;
  agenda: TodayAgendaRow[];
}

export interface TodayFilters {
  courseId?: string;
  teacherId?: string;
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

/**
 * Download the server-rendered register CSV (sessions × enrolled students)
 * for a course over a date range. Returns the raw Blob so the caller can
 * trigger a browser download.
 */
export async function exportJournalCsv(
  courseId: string,
  fromDate: string,
  toDate: string,
): Promise<Blob> {
  const { data } = await apiClient.get<Blob>("/journal/export", {
    params: { course_id: courseId, from_date: fromDate, to_date: toDate },
    responseType: "blob",
  });
  return data;
}

/**
 * The day's agenda — one call returning every scheduled slot for ``date`` in
 * the caller's scope, enriched with session (held/topic) + attendance counts.
 * Optional course / teacher filters (teacher filter is admin/methodist only;
 * a plain teacher is already scoped to their own courses server-side).
 */
export async function journalToday(
  date: string,
  filters: TodayFilters = {},
): Promise<TodayResponse> {
  const { data } = await apiClient.get<TodayResponse>("/journal/today", {
    params: {
      date,
      ...(filters.courseId ? { course_id: filters.courseId } : {}),
      ...(filters.teacherId ? { teacher_id: filters.teacherId } : {}),
    },
  });
  return data;
}

/**
 * Teachers in the caller's org for the Today filter dropdown. Readable by
 * methodists (unlike admin-only /admin/users); org-scope is enforced server-side.
 */
export async function fetchJournalTeachers(): Promise<JournalTeacher[]> {
  const { data } = await apiClient.get<JournalTeacher[]>("/journal/teachers");
  return data;
}

// ── Query hooks ────────────────────────────────────────────────────────

export function useJournalSessions(courseId: string) {
  return useQuery({
    queryKey: ["journal", "sessions", courseId],
    queryFn: () => fetchSessions(courseId),
    enabled: !!courseId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useJournalDay(courseId: string, sessionDate: string) {
  return useQuery({
    queryKey: ["journal", "day", courseId, sessionDate],
    queryFn: () => fetchDay(courseId, sessionDate),
    enabled: !!courseId && !!sessionDate,
    staleTime: 5 * 60 * 1000,
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

export function useJournalToday(date: string, filters: TodayFilters = {}) {
  return useQuery({
    queryKey: ["journal", "today", date, filters.courseId ?? "", filters.teacherId ?? ""],
    queryFn: () => journalToday(date, filters),
    enabled: !!date,
    staleTime: 5 * 60 * 1000,
  });
}
