/**
 * Typed wrapper + TanStack Query hook for GET /api/v1/journal/student-activity.
 *
 * "What one student did on a given day" — a compute-only aggregate over the
 * existing exercise / quiz / assignment submissions (no new table). Shapes
 * mirror backend app/journal/service.py::get_student_activity.
 */
import { useQuery } from "@tanstack/react-query";

import apiClient from "@/lib/api-client";

/** Result palette key (RES in the design handoff). */
export type ActivityResult = "done" | "correct" | "partial" | "wrong" | "skipped";

export interface ActivityExercise {
  id: string;
  title: string;
  /** Exercise type slug (e.g. "quiz", "matching", "assignment"). */
  type: string;
  result: ActivityResult;
  score_pct: number | null;
  /** Item count like "3/5" when available, else null. */
  items: string | null;
}

export interface ActivityLesson {
  course_id: string;
  course_title: string;
  lesson_id: string | null;
  /** Lesson title; null for course-level work (assignments). */
  topic: string | null;
  /** First event time of the day for this lesson, "HH:MM" or null. */
  time: string | null;
  attended: boolean;
  exercises: ActivityExercise[];
}

export interface ActivityEvent {
  /** ISO timestamp. */
  at: string;
  /** "in" (entered/completed a lesson) or a result key. */
  kind: ActivityResult | "in";
  text: string;
}

export interface StudentActivityKpis {
  lessons_attended: number;
  exercises_done: number;
  correct_pct: number;
  time_spent_sec: number;
  xp_earned: number;
}

export interface StudentActivityResponse {
  student: { id: string; name: string };
  date: string;
  group_name: string | null;
  kpis: StudentActivityKpis;
  lessons: ActivityLesson[];
  timeline: ActivityEvent[];
  /** Present only when the day has no activity at all. */
  note?: string;
}

export async function fetchStudentActivity(
  studentId: string,
  date: string,
  groupId?: string,
): Promise<StudentActivityResponse> {
  const { data } = await apiClient.get<StudentActivityResponse>(
    "/journal/student-activity",
    {
      params: {
        student_id: studentId,
        date,
        ...(groupId ? { group_id: groupId } : {}),
      },
    },
  );
  return data;
}

export function useStudentActivity(
  studentId: string,
  date: string,
  groupId?: string,
) {
  return useQuery({
    queryKey: ["journal", "student-activity", studentId, date, groupId ?? ""],
    queryFn: () => fetchStudentActivity(studentId, date, groupId),
    enabled: !!studentId && !!date,
  });
}
