/**
 * TanStack Query hooks for admin analytics dashboards + v2 endpoints.
 *
 * Dashboards are the persisted per-user dashboard layouts. v2 endpoints
 * (kpi-deltas, xp-movers, activity-timeline) back individual widgets.
 *
 * Layout-save uses optimistic update via setQueryData so the UI doesn't
 * flicker on every drag-stop. Failures roll back via onError.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  type ActivityTimelinePoint,
  type AttendanceImpactResponse,
  type CourseEffectivenessRow,
  type CourseTaskStats,
  type DashboardCreatePayload,
  type DashboardResponse,
  type DashboardScope,
  type DashboardUpdatePayload,
  type ExerciseDifficultyRow,
  type FunnelStep,
  type KnowledgeFacets,
  type KpiDeltasResponse,
  type ReviewQueueItem,
  type StudentRiskRow,
  type XpMoversResponse,
  createDashboard,
  deleteDashboard,
  fetchActivityTimeline,
  fetchAttendanceImpact,
  fetchCourseEffectiveness,
  fetchCourseTaskStats,
  fetchExerciseDifficulty,
  fetchKnowledgeFacets,
  fetchKpiDeltas,
  fetchLessonFunnel,
  fetchReviewQueue,
  fetchStudentRisks,
  fetchXpMovers,
  getDashboard,
  listDashboards,
  updateDashboard,
} from "@/lib/api/analytics";

const DASHBOARDS_QK = ["analytics", "dashboards"] as const;
const dashboardQK = (id: string) => ["analytics", "dashboards", id] as const;

// ── Dashboards CRUD ──────────────────────────────────────────────────

export function useDashboards(scope?: DashboardScope) {
  return useQuery<DashboardResponse[]>({
    queryKey: [...DASHBOARDS_QK, { scope }],
    queryFn: () => listDashboards(scope),
    staleTime: 60_000,
  });
}

export function useDashboard(id: string | null | undefined) {
  return useQuery<DashboardResponse>({
    queryKey: id ? dashboardQK(id) : ["analytics", "dashboards", "none"],
    queryFn: () => getDashboard(id as string),
    enabled: Boolean(id),
    staleTime: 30_000,
  });
}

export function useCreateDashboard() {
  const qc = useQueryClient();
  return useMutation<DashboardResponse, Error, DashboardCreatePayload>({
    mutationFn: createDashboard,
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: DASHBOARDS_QK });
      qc.setQueryData(dashboardQK(created.id), created);
    },
    onError: (err) => {
      toast.error(err.message || "Failed to create dashboard");
    },
  });
}

interface UpdateArgs {
  id: string;
  body: DashboardUpdatePayload;
}

export function useUpdateDashboard() {
  const qc = useQueryClient();
  return useMutation<
    DashboardResponse,
    Error,
    UpdateArgs,
    { previous: DashboardResponse | undefined }
  >({
    mutationFn: ({ id, body }) => updateDashboard(id, body),
    onMutate: async ({ id, body }) => {
      await qc.cancelQueries({ queryKey: dashboardQK(id) });
      const previous = qc.getQueryData<DashboardResponse>(dashboardQK(id));
      if (previous) {
        qc.setQueryData<DashboardResponse>(dashboardQK(id), {
          ...previous,
          ...(body.name !== undefined ? { name: body.name } : {}),
          ...(body.layout !== undefined ? { layout: body.layout } : {}),
          ...(body.filters !== undefined ? { filters: body.filters } : {}),
          ...(body.is_default !== undefined ? { is_default: body.is_default } : {}),
          ...(body.view_scope !== undefined ? { view_scope: body.view_scope } : {}),
        });
      }
      return { previous };
    },
    onError: (err, { id }, ctx) => {
      if (ctx?.previous) qc.setQueryData(dashboardQK(id), ctx.previous);
      toast.error(err.message || "Failed to save dashboard");
    },
    onSuccess: (updated) => {
      qc.setQueryData(dashboardQK(updated.id), updated);
      qc.invalidateQueries({ queryKey: DASHBOARDS_QK });
    },
  });
}

export function useDeleteDashboard() {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: deleteDashboard,
    onSuccess: (_v, id) => {
      qc.removeQueries({ queryKey: dashboardQK(id) });
      qc.invalidateQueries({ queryKey: DASHBOARDS_QK });
    },
    onError: (err) => {
      toast.error(err.message || "Failed to delete dashboard");
    },
  });
}

// ── v2 endpoints ─────────────────────────────────────────────────────

export function useKpiDeltas(days = 7) {
  return useQuery<KpiDeltasResponse>({
    queryKey: ["analytics", "v2", "kpi-deltas", days],
    queryFn: () => fetchKpiDeltas(days),
    staleTime: 60_000,
  });
}

export function useXpMovers(windowDays = 7, limit = 10) {
  return useQuery<XpMoversResponse>({
    queryKey: ["analytics", "v2", "xp-movers", windowDays, limit],
    queryFn: () => fetchXpMovers(windowDays, limit),
    staleTime: 60_000,
  });
}

export function useActivityTimeline(days = 30) {
  return useQuery<ActivityTimelinePoint[]>({
    queryKey: ["analytics", "v2", "activity-timeline", days],
    queryFn: () => fetchActivityTimeline(days),
    staleTime: 60_000,
  });
}

export function useCourseEffectiveness() {
  return useQuery<CourseEffectivenessRow[]>({
    queryKey: ["analytics", "v2", "course-effectiveness"],
    queryFn: fetchCourseEffectiveness,
    staleTime: 60_000,
  });
}

export function useExerciseDifficulty(courseId?: string) {
  return useQuery<ExerciseDifficultyRow[]>({
    queryKey: ["analytics", "v2", "exercise-difficulty", courseId ?? null],
    queryFn: () => fetchExerciseDifficulty(courseId),
    staleTime: 60_000,
  });
}

export function useStudentRisks(courseId?: string) {
  return useQuery<StudentRiskRow[]>({
    queryKey: ["analytics", "v2", "student-risks", courseId ?? null],
    queryFn: () => fetchStudentRisks(courseId),
    staleTime: 60_000,
  });
}

export function useAttendanceImpact() {
  return useQuery<AttendanceImpactResponse>({
    queryKey: ["analytics", "v2", "attendance-impact"],
    queryFn: fetchAttendanceImpact,
    staleTime: 60_000,
  });
}

export interface AdminCourse {
  id: string;
  title: string;
}

export function useAdminCourses() {
  return useQuery<AdminCourse[]>({
    queryKey: ["analytics", "admin-courses"],
    queryFn: async () => {
      const { default: apiClient } = await import("@/lib/api-client");
      const { data } = await apiClient.get<AdminCourse[]>("/admin/courses");
      return data;
    },
    staleTime: 5 * 60_000,
  });
}

export function useLessonFunnel(courseId: string | undefined) {
  return useQuery<FunnelStep[]>({
    queryKey: ["analytics", "v2", "lesson-funnel", courseId ?? "none"],
    queryFn: () => fetchLessonFunnel(courseId as string),
    enabled: Boolean(courseId),
    staleTime: 60_000,
  });
}

export function useReviewQueue() {
  return useQuery<ReviewQueueItem[]>({
    queryKey: ["analytics", "review-queue"],
    queryFn: fetchReviewQueue,
    staleTime: 60_000,
  });
}

export function useKnowledgeFacets() {
  return useQuery<KnowledgeFacets>({
    queryKey: ["analytics", "knowledge-facets"],
    queryFn: fetchKnowledgeFacets,
    staleTime: 5 * 60_000,
  });
}

export function useCourseTaskStats(courseId: string | undefined) {
  return useQuery<CourseTaskStats>({
    queryKey: ["analytics", "task-stats", "course", courseId ?? "none"],
    queryFn: () => fetchCourseTaskStats(courseId as string),
    enabled: Boolean(courseId),
    staleTime: 60_000,
  });
}
