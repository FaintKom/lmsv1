/**
 * Typed wrappers around /api/v1/admin/dashboards and
 * /api/v1/admin/analytics/v2/* endpoints.
 *
 * Response shapes mirror backend Pydantic schemas
 * (DashboardResponse, KPI deltas, XP movers, etc.).
 */
import apiClient from "@/lib/api-client";

export type DashboardScope = "own_teacher" | "org" | "global";

export interface DashboardWidget {
  id: string;
  type: string;
  x: number;
  y: number;
  w: number;
  h: number;
  props?: Record<string, unknown>;
}

export interface DashboardLayout {
  widgets?: DashboardWidget[];
}

export interface DashboardFilters {
  range?: string;
  course_ids?: string[];
  teacher_id?: string | null;
  org_id_override?: string | null;
}

export interface DashboardResponse {
  id: string;
  org_id: string;
  user_id: string;
  name: string;
  is_default: boolean;
  view_scope: DashboardScope;
  layout: DashboardLayout;
  filters: DashboardFilters;
  created_at: string;
  updated_at: string;
}

export interface DashboardCreatePayload {
  name: string;
  view_scope?: DashboardScope;
  is_default?: boolean;
  layout?: DashboardLayout;
  filters?: DashboardFilters;
}

export type DashboardUpdatePayload = Partial<DashboardCreatePayload>;

// ── CRUD ──────────────────────────────────────────────────────────────

export async function listDashboards(scope?: DashboardScope): Promise<DashboardResponse[]> {
  const { data } = await apiClient.get<DashboardResponse[]>("/admin/dashboards", {
    params: scope ? { scope } : undefined,
  });
  return data;
}

export async function createDashboard(
  body: DashboardCreatePayload,
): Promise<DashboardResponse> {
  const { data } = await apiClient.post<DashboardResponse>(
    "/admin/dashboards",
    body,
  );
  return data;
}

export async function getDashboard(id: string): Promise<DashboardResponse> {
  const { data } = await apiClient.get<DashboardResponse>(
    `/admin/dashboards/${id}`,
  );
  return data;
}

export async function updateDashboard(
  id: string,
  body: DashboardUpdatePayload,
): Promise<DashboardResponse> {
  const { data } = await apiClient.patch<DashboardResponse>(
    `/admin/dashboards/${id}`,
    body,
  );
  return data;
}

export async function deleteDashboard(id: string): Promise<void> {
  await apiClient.delete(`/admin/dashboards/${id}`);
}

// ── v2 analytics endpoints ────────────────────────────────────────────

export interface KpiMetric {
  current: number;
  previous: number;
  delta_pct: number | null;
}

export interface KpiDeltasResponse {
  window_days: number;
  current_window: { start: string; end: string };
  previous_window: { start: string; end: string };
  metrics: {
    submissions: KpiMetric;
    avg_score: KpiMetric;
    active_students: KpiMetric;
    new_enrollments: KpiMetric;
    completed_enrollments: KpiMetric;
  };
}

export async function fetchKpiDeltas(days = 7): Promise<KpiDeltasResponse> {
  const { data } = await apiClient.get<KpiDeltasResponse>(
    "/admin/analytics/v2/kpi-deltas",
    { params: { days } },
  );
  return data;
}

export interface XpMover {
  user_id: string;
  email: string;
  full_name: string | null;
  submission_count: number;
  score_sum: number;
  avg_score: number;
}

export interface XpDecliner {
  user_id: string;
  email: string;
  full_name: string | null;
  prior_count: number;
}

export interface XpMoversResponse {
  window_days: number;
  window_start: string;
  window_end: string;
  movers: XpMover[];
  decliners: XpDecliner[];
}

export async function fetchXpMovers(
  windowDays = 7,
  limit = 10,
): Promise<XpMoversResponse> {
  const { data } = await apiClient.get<XpMoversResponse>(
    "/admin/analytics/v2/xp-movers",
    { params: { window_days: windowDays, limit } },
  );
  return data;
}

export interface ActivityTimelinePoint {
  date: string;
  submissions: number;
  active_students: number;
}

export async function fetchActivityTimeline(
  days = 30,
): Promise<ActivityTimelinePoint[]> {
  const { data } = await apiClient.get<ActivityTimelinePoint[]>(
    "/admin/analytics/v2/activity-timeline",
    { params: { days } },
  );
  return data;
}

export function analyticsReportUrl(format: "csv" | "pdf" = "csv", windowDays = 30): string {
  // Full path here (not via apiClient) — used as <a href> for direct download.
  return `/api/v1/admin/analytics/report?format=${format}&window_days=${windowDays}`;
}

// ── More v2 endpoints (Sprint A3) ────────────────────────────────────

export interface CourseEffectivenessRow {
  course_id: string;
  course_title: string;
  enrollments: number;
  completion_rate: number;
  avg_score: number | null;
}

export async function fetchCourseEffectiveness(): Promise<CourseEffectivenessRow[]> {
  const { data } = await apiClient.get<CourseEffectivenessRow[]>(
    "/admin/analytics/v2/course-effectiveness",
  );
  return data;
}

export interface ExerciseDifficultyRow {
  exercise_id: string;
  title: string;
  attempts: number;
  pass_rate: number;
  avg_score: number | null;
}

export async function fetchExerciseDifficulty(
  courseId?: string,
): Promise<ExerciseDifficultyRow[]> {
  const { data } = await apiClient.get<ExerciseDifficultyRow[]>(
    "/admin/analytics/v2/exercise-difficulty",
    { params: courseId ? { course_id: courseId } : undefined },
  );
  return data;
}

export interface StudentRiskRow {
  user_id: string;
  email: string;
  full_name: string | null;
  risk_level: "high" | "medium" | "low";
  risk_score: number;
  last_active_days: number | null;
}

export async function fetchStudentRisks(
  courseId?: string,
): Promise<StudentRiskRow[]> {
  const { data } = await apiClient.get<StudentRiskRow[]>(
    "/admin/analytics/v2/student-risks",
    { params: courseId ? { course_id: courseId } : undefined },
  );
  return data;
}

export interface AttendanceImpactResponse {
  high_attendance_avg_score: number | null;
  low_attendance_avg_score: number | null;
  correlation: number | null;
  sample_size: number;
}

export async function fetchAttendanceImpact(): Promise<AttendanceImpactResponse> {
  const { data } = await apiClient.get<AttendanceImpactResponse>(
    "/admin/analytics/v2/attendance-impact",
  );
  return data;
}

export interface FunnelStep {
  lesson_id: string;
  lesson_title: string;
  reached: number;
  completed: number;
  drop_rate: number;
}

export async function fetchLessonFunnel(courseId: string): Promise<FunnelStep[]> {
  const { data } = await apiClient.get<FunnelStep[]>(
    `/admin/analytics/v2/courses/${courseId}/funnel`,
  );
  return data;
}

// ── Role-specific widgets ─────────────────────────────────────────────

export interface ReviewQueueItem {
  id: string;
  assignment_id: string;
  assignment_title: string;
  student_name: string;
  submitted_at: string;
}

export async function fetchReviewQueue(): Promise<ReviewQueueItem[]> {
  const { data } = await apiClient.get<ReviewQueueItem[]>("/admin/review-queue");
  return data;
}

export interface FacetCount {
  value: string;
  count: number;
}

export interface KnowledgeFacets {
  type: FacetCount[];
  stage: FacetCount[];
  audience: FacetCount[];
  mode: FacetCount[];
  problems: FacetCount[];
}

export async function fetchKnowledgeFacets(): Promise<KnowledgeFacets> {
  const { data } = await apiClient.get<KnowledgeFacets>("/knowledge/facets");
  return data;
}
