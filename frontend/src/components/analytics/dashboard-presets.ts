/**
 * Role-aware starter dashboards.
 *
 * When a staff member opens analytics for the first time we seed a
 * dashboard tailored to what their role actually needs to see:
 *
 *   - admin / super_admin → org-wide health (KPIs, risks, course
 *     effectiveness, attendance, engagement movers).
 *   - teacher             → their own classroom (KPIs, activity, risks,
 *     movers) scoped to their courses.
 *   - methodist           → curriculum quality (course effectiveness,
 *     exercise difficulty, activity) across the org.
 *
 * The methodist signal is a boolean flag on the user, not a distinct
 * role, so it is checked before the plain-teacher branch.
 */
import type { DashboardScope, DashboardWidget } from "@/lib/api/analytics";

export type StaffRole = "super_admin" | "admin" | "teacher" | "student" | "parent";

export interface DashboardPreset {
  name: string;
  view_scope: DashboardScope;
  widgets: DashboardWidget[];
  filters: { range?: string; course_ids?: string[] };
}

const ADMIN_WIDGETS: DashboardWidget[] = [
  { id: "kpi-1", type: "kpi-tile", x: 0, y: 0, w: 6, h: 5, props: { days: 7 } },
  { id: "act-1", type: "activity-timeline", x: 6, y: 0, w: 6, h: 5, props: { days: 30 } },
  { id: "risk-1", type: "student-risks", x: 0, y: 5, w: 6, h: 5, props: {} },
  { id: "mov-1", type: "top-movers", x: 6, y: 5, w: 6, h: 5, props: { window_days: 7, limit: 5 } },
  { id: "course-1", type: "course-effectiveness", x: 0, y: 10, w: 8, h: 5, props: {} },
  { id: "att-1", type: "attendance-impact", x: 8, y: 10, w: 4, h: 3, props: {} },
];

const TEACHER_WIDGETS: DashboardWidget[] = [
  { id: "kpi-1", type: "kpi-tile", x: 0, y: 0, w: 6, h: 5, props: { days: 7 } },
  { id: "act-1", type: "activity-timeline", x: 6, y: 0, w: 6, h: 5, props: { days: 30 } },
  { id: "risk-1", type: "student-risks", x: 0, y: 5, w: 6, h: 5, props: {} },
  { id: "mov-1", type: "top-movers", x: 6, y: 5, w: 6, h: 5, props: { window_days: 7, limit: 5 } },
  { id: "review-1", type: "review-queue", x: 0, y: 10, w: 4, h: 5, props: { limit: 6 } },
  { id: "taskperf-1", type: "task-performance", x: 0, y: 15, w: 8, h: 6, props: {} },
];

const METHODIST_WIDGETS: DashboardWidget[] = [
  { id: "course-1", type: "course-effectiveness", x: 0, y: 0, w: 8, h: 5, props: {} },
  { id: "kpi-1", type: "kpi-tile", x: 8, y: 0, w: 4, h: 5, props: { days: 30 } },
  { id: "exdiff-1", type: "exercise-difficulty", x: 0, y: 5, w: 8, h: 5, props: {} },
  { id: "act-1", type: "activity-timeline", x: 8, y: 5, w: 4, h: 4, props: { days: 30 } },
  { id: "taskperf-1", type: "task-performance", x: 0, y: 15, w: 8, h: 6, props: {} },
];

export function presetForUser(
  role: StaffRole | undefined,
  isMethodist: boolean,
): DashboardPreset {
  if (isMethodist) {
    return {
      name: "Curriculum overview",
      view_scope: "org",
      widgets: METHODIST_WIDGETS,
      filters: { range: "30d" },
    };
  }
  if (role === "teacher") {
    return {
      name: "My classroom",
      view_scope: "own_teacher",
      widgets: TEACHER_WIDGETS,
      filters: { range: "30d" },
    };
  }
  // admin + super_admin (and any other staff) get the org-health board.
  return {
    name: "Organization overview",
    view_scope: role === "super_admin" ? "global" : "org",
    widgets: ADMIN_WIDGETS,
    filters: { range: "30d" },
  };
}
