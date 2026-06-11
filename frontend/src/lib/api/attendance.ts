/**
 * Typed wrappers + TanStack Query hooks around /api/v1/attendance/* endpoints.
 *
 * Response shapes mirror backend handlers in app/attendance/router.py.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import apiClient from "@/lib/api-client";

export type AttendanceStatus = "present" | "late" | "absent" | "excused";

export interface RosterRow {
  student_id: string;
  student_name: string;
  status: AttendanceStatus | null;
  note: string | null;
}

export interface RosterResponse {
  course_id: string;
  session_date: string;
  roster: RosterRow[];
}

export interface AttendanceMark {
  student_id: string;
  course_id?: string | null;
  session_date: string;
  status: AttendanceStatus;
  note?: string | null;
}

export interface BulkMarkResult {
  created: number;
  updated: number;
}

export interface StudentSummary {
  present: number;
  late: number;
  absent: number;
  excused: number;
  total: number;
  student_name: string;
}

export interface SummaryResponse {
  summary: Record<string, StudentSummary>;
}

export interface MyAttendanceRecord {
  id: string;
  course_id: string | null;
  course_title: string | null;
  session_date: string | null;
  status: AttendanceStatus;
  note: string | null;
}

export interface MyAttendanceResponse {
  records: MyAttendanceRecord[];
}

// ── Raw API functions ──────────────────────────────────────────────────

export async function fetchRoster(
  courseId: string,
  sessionDate: string,
): Promise<RosterResponse> {
  const { data } = await apiClient.get<RosterResponse>("/attendance/roster", {
    params: { course_id: courseId, session_date: sessionDate },
  });
  return data;
}

export async function markBulk(
  records: AttendanceMark[],
): Promise<BulkMarkResult> {
  const { data } = await apiClient.post<BulkMarkResult>("/attendance", {
    records,
  });
  return data;
}

export async function fetchSummary(
  courseId: string,
): Promise<SummaryResponse> {
  const { data } = await apiClient.get<SummaryResponse>("/attendance/summary", {
    params: { course_id: courseId },
  });
  return data;
}

export async function fetchMyAttendance(): Promise<MyAttendanceResponse> {
  const { data } =
    await apiClient.get<MyAttendanceResponse>("/attendance/my");
  return data;
}

// ── Query hooks ────────────────────────────────────────────────────────

export function useRoster(courseId: string, sessionDate: string) {
  return useQuery({
    queryKey: ["attendance", "roster", courseId, sessionDate],
    queryFn: () => fetchRoster(courseId, sessionDate),
    enabled: !!courseId && !!sessionDate,
    staleTime: 5 * 60 * 1000,
  });
}

export function useAttendanceSummary(courseId: string) {
  return useQuery({
    queryKey: ["attendance", "summary", courseId],
    queryFn: () => fetchSummary(courseId),
    enabled: !!courseId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useMyAttendance() {
  return useQuery({
    queryKey: ["attendance", "my"],
    queryFn: fetchMyAttendance,
    staleTime: 5 * 60 * 1000,
  });
}

export function useMarkBulk(courseId: string, sessionDate: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (records: AttendanceMark[]) => markBulk(records),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ["attendance", "roster", courseId, sessionDate],
      });
      qc.invalidateQueries({ queryKey: ["attendance", "summary", courseId] });
    },
  });
}
