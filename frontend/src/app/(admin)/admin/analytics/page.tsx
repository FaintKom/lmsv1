"use client";

import { useEffect, useState, useMemo } from "react";
import apiClient from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users,
  BookOpen,
  TrendingUp,
  BarChart3,
  Target,
  Award,
  AlertTriangle,
  Activity,
  Download,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  Flame,
  Calendar,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useTranslation } from "@/lib/i18n/context";

// ── Types ──────────────────────────────────────────────────────────

interface OverviewKPIs {
  total_students: number;
  active_7d: number;
  total_courses: number;
  total_enrollments: number;
  completion_rate: number;
  avg_score: number;
  at_risk_high: number;
  at_risk_medium: number;
  at_risk_low: number;
}

interface StudentRisk {
  student_id: string;
  full_name: string;
  email: string;
  risk_level: "high" | "medium" | "low";
  risk_score: number;
  days_inactive: number | null;
  avg_score: number;
  avg_progress: number;
  current_streak: number;
  enrollment_count: number;
  completed_count: number;
}

interface CourseEffectiveness {
  course_id: string;
  title: string;
  status: string;
  total_enrolled: number;
  completed: number;
  completion_rate: number;
  avg_score: number | null;
  avg_days_to_complete: number | null;
  active_7d: number;
  avg_progress: number;
}

interface LessonFunnel {
  lesson_id: string;
  title: string;
  position: number;
  total_enrolled: number;
  started: number;
  completed: number;
  drop_off_rate: number;
  avg_score: number | null;
}

interface ExerciseDifficulty {
  exercise_id: string;
  title: string;
  exercise_type: string;
  total_submissions: number;
  unique_students: number;
  pass_rate: number;
  avg_score: number;
  avg_attempts: number;
  difficulty: "easy" | "medium" | "hard";
}

interface ActivityDay {
  date: string;
  submissions: number;
  active_students: number;
  lessons_completed: number;
  avg_score: number | null;
}

interface AttendanceStudent {
  student_id: string;
  full_name: string;
  attendance_rate: number;
  avg_score: number | null;
}

interface AttendanceData {
  students: AttendanceStudent[];
  avg_attendance_rate: number | null;
  has_data: boolean;
}

// ── Constants ──────────────────────────────────────────────────────

const TAB_KEYS = ["overview", "students", "courses", "exercises", "attendance"] as const;

type TabKey = (typeof TAB_KEYS)[number];

const RISK_COLORS = { high: "#ef4444", medium: "#f59e0b", low: "#10b981" };
const RISK_BG = { high: "bg-red-50", medium: "bg-amber-50", low: "bg-emerald-50" };
const RISK_TEXT = { high: "text-red-700", medium: "text-amber-700", low: "text-emerald-700" };
const DIFFICULTY_BG: Record<string, string> = { easy: "bg-emerald-50", medium: "bg-amber-50", hard: "bg-red-50" };
const DIFFICULTY_TEXT: Record<string, string> = { easy: "text-emerald-700", medium: "text-amber-700", hard: "text-red-700" };

// Exercise type display labels — kept short enum-style; long labels go through t() at usage sites
const EXERCISE_TYPE_LABELS_FALLBACK: Record<string, string> = {
  multiple_choice: "Multiple choice",
  single_choice: "Single choice",
  true_false: "True/False",
  short_answer: "Short answer",
  fill_blank: "Fill blank",
  matching: "Matching",
  ordering: "Ordering",
  code_challenge: "Code",
  essay: "Essay",
  file_upload: "File upload",
  video_response: "Video response",
  audio_response: "Audio response",
  interactive_widget: "Widget",
  math_input: "Math",
  robot_2d: "Robot 2D",
  world_3d: "World 3D",
  peer_review: "Peer review",
  group_project: "Group project",
  web_editor: "Web editor",
};

// ── Component ──────────────────────────────────────────────────────

export default function AdminAnalyticsPage() {
  const { t } = useTranslation();
  const TABS = TAB_KEYS.map((key) => ({ key, label: t(`admin.analytics.tab${key.charAt(0).toUpperCase()}${key.slice(1)}`) }));
  const RISK_LABEL: Record<"high" | "medium" | "low", string> = {
    high: t("admin.analytics.riskHigh"),
    medium: t("admin.analytics.riskMedium"),
    low: t("admin.analytics.riskLow"),
  };
  const DIFFICULTY_LABEL: Record<string, string> = {
    easy: t("admin.analytics.difficultyEasy"),
    medium: t("admin.analytics.difficultyMedium"),
    hard: t("admin.analytics.difficultyHard"),
  };
  const [tab, setTab] = useState<TabKey>("overview");
  const [loading, setLoading] = useState(true);

  // Data states
  const [overview, setOverview] = useState<OverviewKPIs | null>(null);
  const [timeline, setTimeline] = useState<ActivityDay[]>([]);
  const [risks, setRisks] = useState<StudentRisk[]>([]);
  const [courses, setCourses] = useState<CourseEffectiveness[]>([]);
  const [exercises, setExercises] = useState<ExerciseDifficulty[]>([]);
  const [attendance, setAttendance] = useState<AttendanceData | null>(null);
  const [funnel, setFunnel] = useState<LessonFunnel[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);

  // Filters
  const [riskFilter, setRiskFilter] = useState<"all" | "high" | "medium" | "low">("all");
  const [difficultyFilter, setDifficultyFilter] = useState<"all" | "easy" | "medium" | "hard">("all");

  useEffect(() => {
    setLoading(true);
    Promise.all([
      apiClient.get<OverviewKPIs>("/admin/analytics/v2/overview").then(r => r.data).catch(() => null),
      apiClient.get<ActivityDay[]>("/admin/analytics/v2/activity-timeline").then(r => r.data).catch((): ActivityDay[] => []),
      apiClient.get<StudentRisk[]>("/admin/analytics/v2/student-risks").then(r => r.data).catch((): StudentRisk[] => []),
      apiClient.get<CourseEffectiveness[]>("/admin/analytics/v2/course-effectiveness").then(r => r.data).catch((): CourseEffectiveness[] => []),
      apiClient.get<ExerciseDifficulty[]>("/admin/analytics/v2/exercise-difficulty").then(r => r.data).catch((): ExerciseDifficulty[] => []),
      apiClient.get<AttendanceData>("/admin/analytics/v2/attendance-impact").then(r => r.data).catch(() => null),
    ])
      .then(([ov, tl, ri, co, ex, at]) => {
        setOverview(ov);
        setTimeline(tl);
        setRisks(ri);
        setCourses(co);
        setExercises(ex);
        setAttendance(at);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedCourse) {
      setFunnel([]);
      return;
    }
    apiClient
      .get<LessonFunnel[]>(`/admin/analytics/v2/courses/${selectedCourse}/funnel`)
      .then(r => setFunnel(r.data))
      .catch(() => setFunnel([]));
  }, [selectedCourse]);

  const filteredRisks = useMemo(
    () => (riskFilter === "all" ? risks : risks.filter(r => r.risk_level === riskFilter)),
    [risks, riskFilter],
  );

  const filteredExercises = useMemo(
    () => (difficultyFilter === "all" ? exercises : exercises.filter(e => e.difficulty === difficultyFilter)),
    [exercises, difficultyFilter],
  );

  const riskPieData = useMemo(() => {
    if (!overview) return [];
    return [
      { name: RISK_LABEL.high, value: overview.at_risk_high, fill: RISK_COLORS.high },
      { name: RISK_LABEL.medium, value: overview.at_risk_medium, fill: RISK_COLORS.medium },
      { name: RISK_LABEL.low, value: overview.at_risk_low, fill: RISK_COLORS.low },
    ].filter(d => d.value > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overview]);

  const handleExportCSV = async () => {
    try {
      const response = await apiClient.get("/admin/analytics/export-csv/", { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = "analytics_export.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      // handled by interceptor
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">{t("admin.analytics.title")}</h1>
          <p className="mt-1 text-sm text-text-muted">{t("admin.analytics.subtitle")}</p>
        </div>
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90"
        >
          <Download className="h-4 w-4" />
          {t("admin.analytics.exportCsv")}
        </button>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-xl bg-surface-2 p-1">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              tab === t.key
                ? "bg-white text-text shadow-sm"
                : "text-text-muted hover:text-text"
            }`}
          >
            {t.label}
            {t.key === "students" && overview && overview.at_risk_high > 0 && (
              <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                {overview.at_risk_high}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "overview" && <OverviewTab t={t} overview={overview} timeline={timeline} riskPieData={riskPieData} courses={courses} />}
      {tab === "students" && (
        <StudentsTab
          t={t}
          riskLabel={RISK_LABEL}
          risks={filteredRisks}
          riskFilter={riskFilter}
          setRiskFilter={setRiskFilter}
          totalCounts={overview ? { high: overview.at_risk_high, medium: overview.at_risk_medium, low: overview.at_risk_low } : null}
        />
      )}
      {tab === "courses" && (
        <CoursesTab
          t={t}
          courses={courses}
          funnel={funnel}
          selectedCourse={selectedCourse}
          setSelectedCourse={setSelectedCourse}
        />
      )}
      {tab === "exercises" && (
        <ExercisesTab
          t={t}
          difficultyLabel={DIFFICULTY_LABEL}
          exercises={filteredExercises}
          difficultyFilter={difficultyFilter}
          setDifficultyFilter={setDifficultyFilter}
        />
      )}
      {tab === "attendance" && <AttendanceTab t={t} data={attendance} />}
    </div>
  );
}

// ── KPI Card ───────────────────────────────────────────────────────

function KpiCard({
  icon: Icon,
  label,
  value,
  subtitle,
  trend,
  color = "bg-primary-soft text-primary",
}: {
  icon: typeof Users;
  label: string;
  value: string | number;
  subtitle?: string;
  trend?: "up" | "down" | null;
  color?: string;
}) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="flex items-start gap-4 p-5">
        <div className={`rounded-xl p-2.5 ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-text-subtle">{label}</p>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold text-text">{value}</p>
            {trend === "up" && <ArrowUpRight className="h-4 w-4 text-emerald-500" />}
            {trend === "down" && <ArrowDownRight className="h-4 w-4 text-red-500" />}
          </div>
          {subtitle && <p className="mt-0.5 text-[11px] text-text-subtle">{subtitle}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Overview Tab ───────────────────────────────────────────────────

function OverviewTab({
  t,
  overview,
  timeline,
  riskPieData,
  courses,
}: {
  t: (key: string) => string;
  overview: OverviewKPIs | null;
  timeline: ActivityDay[];
  riskPieData: { name: string; value: number; fill: string }[];
  courses: CourseEffectiveness[];
}) {
  if (!overview) return <EmptyState text={t("admin.analytics.noData")} />;

  const labelSubmissions = t("admin.analytics.colSubmissions");
  const labelActive = t("admin.analytics.colActive");
  const labelLessons = t("admin.analytics.colLessons");
  const chartData = timeline.map(d => ({
    date: d.date.slice(5),
    [labelSubmissions]: d.submissions,
    [labelActive]: d.active_students,
    [labelLessons]: d.lessons_completed,
  }));

  const topCourses = courses
    .filter(c => c.total_enrolled > 0)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard icon={Users} label={t("admin.analytics.kpiStudents")} value={overview.total_students} />
        <KpiCard
          icon={Activity}
          label={t("admin.analytics.kpiActive7d")}
          value={overview.active_7d}
          subtitle={t("admin.analytics.kpiActive7dSub").replace("{pct}", String(overview.total_students > 0 ? Math.round(overview.active_7d / overview.total_students * 100) : 0))}
        />
        <KpiCard icon={BookOpen} label={t("admin.analytics.kpiCourses")} value={overview.total_courses} />
        <KpiCard icon={Target} label={t("admin.analytics.kpiCompletion")} value={`${overview.completion_rate}%`} />
        <KpiCard icon={Award} label={t("admin.analytics.kpiAvgScore")} value={`${overview.avg_score}%`} />
        <KpiCard
          icon={AlertTriangle}
          label={t("admin.analytics.kpiAtRisk")}
          value={overview.at_risk_high + overview.at_risk_medium}
          subtitle={t("admin.analytics.kpiAtRiskSub").replace("{high}", String(overview.at_risk_high)).replace("{medium}", String(overview.at_risk_medium))}
          color="bg-red-50 text-red-600"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Activity timeline */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-primary" />
              {t("admin.analytics.activity30Days")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="gradSub" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradActive" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={4} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                  <Area type="monotone" dataKey={labelSubmissions} stroke="#6366f1" fill="url(#gradSub)" strokeWidth={2} />
                  <Area type="monotone" dataKey={labelActive} stroke="#10b981" fill="url(#gradActive)" strokeWidth={2} />
                  <Area type="monotone" dataKey={labelLessons} stroke="#f59e0b" fill="transparent" strokeWidth={1.5} strokeDasharray="4 4" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState text={t("admin.analytics.no30Day")} />
            )}
          </CardContent>
        </Card>

        {/* Risk pie */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              {t("admin.analytics.studentRisks")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {riskPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={riskPieData}
                    cx="50%"
                    cy="45%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {riskPieData.map((d, i) => (
                      <Cell key={i} fill={d.fill} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState text={t("admin.analytics.noRiskData")} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top courses grid */}
      {topCourses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BookOpen className="h-4 w-4 text-primary" />
              {t("admin.analytics.topCoursesByEnrollment")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {topCourses.map(c => (
                <div key={c.course_id} className="rounded-xl border border-ink-100 p-3">
                  <p className="mb-2 text-sm font-semibold text-text line-clamp-2">{c.title}</p>
                  <div className="space-y-1 text-[11px]">
                    <Metric label={t("admin.analytics.metricEnrolled")} value={c.total_enrolled} />
                    <Metric label={t("admin.analytics.metricCompleted")} value={`${c.completion_rate}%`} />
                    <Metric label={t("admin.analytics.kpiAvgScore")} value={c.avg_score != null ? `${c.avg_score}%` : "—"} />
                    <Metric label={t("admin.analytics.metricActive7d")} value={c.active_7d} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Students Tab ──────────────────────────────────────────────────

function StudentsTab({
  t,
  riskLabel,
  risks,
  riskFilter,
  setRiskFilter,
  totalCounts,
}: {
  t: (key: string) => string;
  riskLabel: Record<"high" | "medium" | "low", string>;
  risks: StudentRisk[];
  riskFilter: string;
  setRiskFilter: (v: "all" | "high" | "medium" | "low") => void;
  totalCounts: { high: number; medium: number; low: number } | null;
}) {
  return (
    <div className="space-y-4">
      {/* Filter pills */}
      <div className="flex flex-wrap gap-2">
        {(["all", "high", "medium", "low"] as const).map(f => (
          <button
            key={f}
            onClick={() => setRiskFilter(f)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              riskFilter === f
                ? "bg-ink-800 text-white"
                : "bg-surface-2 text-text-muted hover:bg-ink-100"
            }`}
          >
            {f === "all" ? t("admin.analytics.allFilter") : riskLabel[f]}
            {f !== "all" && totalCounts && (
              <span className="ml-1 opacity-60">({totalCounts[f]})</span>
            )}
          </button>
        ))}
      </div>

      {risks.length === 0 ? (
        <EmptyState text={t("admin.analytics.noStudentsToShow")} />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-surface-2 text-left text-xs font-medium text-text-subtle">
                    <th className="px-4 py-3">{t("admin.analytics.colStudent")}</th>
                    <th className="px-4 py-3">{t("admin.analytics.colRisk")}</th>
                    <th className="px-4 py-3 text-center">{t("admin.analytics.colDaysInactive")}</th>
                    <th className="px-4 py-3 text-center">{t("admin.analytics.colAvgScore")}</th>
                    <th className="px-4 py-3">{t("admin.analytics.colProgress")}</th>
                    <th className="px-4 py-3 text-center">{t("admin.analytics.colStreak")}</th>
                    <th className="px-4 py-3 text-center">{t("admin.analytics.colCourses")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {risks.map(r => (
                    <tr key={r.student_id} className="hover:bg-surface-2/50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-text">{r.full_name}</p>
                        <p className="text-[11px] text-text-subtle">{r.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${RISK_BG[r.risk_level]} ${RISK_TEXT[r.risk_level]}`}>
                          {riskLabel[r.risk_level]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center tabular-nums">
                        {r.days_inactive != null ? r.days_inactive : "—"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <ScoreBadge value={r.avg_score} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-ink-100">
                            <div
                              className="h-full rounded-full bg-primary transition-all"
                              style={{ width: `${Math.min(r.avg_progress, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs tabular-nums text-text-muted">{r.avg_progress}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-0.5 text-xs tabular-nums text-text-muted">
                          {r.current_streak > 0 && <Flame className="h-3 w-3 text-amber-500" />}
                          {r.current_streak}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center tabular-nums text-text-muted">
                        {r.completed_count}/{r.enrollment_count}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Courses Tab ───────────────────────────────────────────────────

function CoursesTab({
  t,
  courses,
  funnel,
  selectedCourse,
  setSelectedCourse,
}: {
  t: (key: string) => string;
  courses: CourseEffectiveness[];
  funnel: LessonFunnel[];
  selectedCourse: string | null;
  setSelectedCourse: (id: string | null) => void;
}) {
  return (
    <div className="space-y-6">
      {courses.length === 0 ? (
        <EmptyState text={t("admin.analytics.noCourseAnalysis")} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map(c => (
              <Card
                key={c.course_id}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  selectedCourse === c.course_id ? "ring-2 ring-primary" : ""
                }`}
                onClick={() => setSelectedCourse(selectedCourse === c.course_id ? null : c.course_id)}
              >
                <CardContent className="p-4">
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold text-text line-clamp-2">{c.title}</h3>
                    <ChevronRight className={`h-4 w-4 shrink-0 text-text-subtle transition-transform ${selectedCourse === c.course_id ? "rotate-90" : ""}`} />
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[11px]">
                    <Metric label={t("admin.analytics.metricEnrolled")} value={c.total_enrolled} />
                    <Metric label={t("admin.analytics.metricCompleted")} value={`${c.completion_rate}%`} />
                    <Metric label={t("admin.analytics.kpiAvgScore")} value={c.avg_score != null ? `${c.avg_score}%` : "—"} />
                    <Metric label={t("admin.analytics.metricAvgProgress")} value={`${c.avg_progress}%`} />
                    <Metric label={t("admin.analytics.metricActive7d")} value={c.active_7d} />
                    <Metric label={t("admin.analytics.metricDaysToComplete")} value={c.avg_days_to_complete ?? "—"} />
                  </div>
                  {/* Mini progress bar */}
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-ink-100">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${c.avg_progress}%` }}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Lesson funnel */}
          {selectedCourse && funnel.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  {t("admin.analytics.lessonFunnel")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={Math.max(funnel.length * 36, 200)}>
                  <BarChart data={funnel} layout="vertical" margin={{ left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis type="number" tick={{ fontSize: 10 }} stroke="#94a3b8" allowDecimals={false} />
                    <YAxis
                      type="category"
                      dataKey="title"
                      tick={{ fontSize: 10 }}
                      width={180}
                      stroke="#94a3b8"
                    />
                    <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="started" name={t("admin.analytics.colStarted")} fill="#6366f1" radius={[0, 2, 2, 0]} />
                    <Bar dataKey="completed" name={t("admin.analytics.colCompleted")} fill="#10b981" radius={[0, 2, 2, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

// ── Exercises Tab ─────────────────────────────────────────────────

function ExercisesTab({
  t,
  difficultyLabel,
  exercises,
  difficultyFilter,
  setDifficultyFilter,
}: {
  t: (key: string) => string;
  difficultyLabel: Record<string, string>;
  exercises: ExerciseDifficulty[];
  difficultyFilter: string;
  setDifficultyFilter: (v: "all" | "easy" | "medium" | "hard") => void;
}) {
  return (
    <div className="space-y-4">
      {/* Filter pills */}
      <div className="flex flex-wrap gap-2">
        {(["all", "hard", "medium", "easy"] as const).map(f => (
          <button
            key={f}
            onClick={() => setDifficultyFilter(f)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              difficultyFilter === f
                ? "bg-ink-800 text-white"
                : "bg-surface-2 text-text-muted hover:bg-ink-100"
            }`}
          >
            {f === "all" ? t("admin.analytics.allFilter") : difficultyLabel[f]}
          </button>
        ))}
      </div>

      {exercises.length === 0 ? (
        <EmptyState text={t("admin.analytics.noExerciseData")} />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-surface-2 text-left text-xs font-medium text-text-subtle">
                    <th className="px-4 py-3">{t("admin.analytics.colExercise")}</th>
                    <th className="px-4 py-3">{t("admin.analytics.colType")}</th>
                    <th className="px-4 py-3">{t("admin.analytics.colDifficulty")}</th>
                    <th className="px-4 py-3 text-center">{t("admin.analytics.colPassRate")}</th>
                    <th className="px-4 py-3 text-center">{t("admin.analytics.colAvgScore")}</th>
                    <th className="px-4 py-3 text-center">{t("admin.analytics.colAttempts")}</th>
                    <th className="px-4 py-3 text-center">{t("admin.analytics.colStudents")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {exercises.map(ex => (
                    <tr key={ex.exercise_id} className="hover:bg-surface-2/50 transition-colors">
                      <td className="max-w-[200px] truncate px-4 py-3 font-medium text-text">
                        {ex.title || t("admin.analytics.untitled")}
                      </td>
                      <td className="px-4 py-3 text-text-muted">
                        <span className="rounded bg-ink-50 px-1.5 py-0.5 text-[11px]">
                          {EXERCISE_TYPE_LABELS_FALLBACK[ex.exercise_type] || ex.exercise_type}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${DIFFICULTY_BG[ex.difficulty]} ${DIFFICULTY_TEXT[ex.difficulty]}`}>
                          {difficultyLabel[ex.difficulty]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <ScoreBadge value={ex.pass_rate} />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <ScoreBadge value={ex.avg_score} />
                      </td>
                      <td className="px-4 py-3 text-center tabular-nums text-text-muted">
                        {ex.avg_attempts}
                      </td>
                      <td className="px-4 py-3 text-center tabular-nums text-text-muted">
                        {ex.unique_students}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Attendance Tab ────────────────────────────────────────────────

function AttendanceTab({ t, data }: { t: (key: string) => string; data: AttendanceData | null }) {
  const buckets = useMemo(() => {
    if (!data || !data.has_data) return [];
    const result: { range: string; count: number; avgScore: number }[] = [];
    const ranges = [
      { label: "90–100%", min: 90, max: 101 },
      { label: "70–89%", min: 70, max: 90 },
      { label: "50–69%", min: 50, max: 70 },
      { label: "<50%", min: 0, max: 50 },
    ];
    for (const r of ranges) {
      const inRange = data.students.filter(s => s.attendance_rate >= r.min && s.attendance_rate < r.max);
      const scores = inRange.filter(s => s.avg_score != null).map(s => s.avg_score!);
      result.push({
        range: r.label,
        count: inRange.length,
        avgScore: scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
      });
    }
    return result;
  }, [data]);

  if (!data || !data.has_data) {
    return <EmptyState text={t("admin.analytics.noAttendanceData")} />;
  }

  return (
    <div className="space-y-6">
      {/* Summary KPI */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard
          icon={Calendar}
          label={t("admin.analytics.attendanceAvg")}
          value={data.avg_attendance_rate != null ? `${data.avg_attendance_rate}%` : "—"}
        />
        <KpiCard
          icon={Users}
          label={t("admin.analytics.studentsWithData")}
          value={data.students.length}
        />
        <KpiCard
          icon={AlertTriangle}
          label={t("admin.analytics.attendanceBelow50")}
          value={data.students.filter(s => s.attendance_rate < 50).length}
          color="bg-red-50 text-red-600"
        />
      </div>

      {/* Attendance vs Score chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("admin.analytics.attendanceVsScore")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={buckets}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="range" tick={{ fontSize: 11 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="count" name={t("admin.analytics.kpiStudents")} fill="#6366f1" radius={[4, 4, 0, 0]} />
              <Bar dataKey="avgScore" name={t("admin.analytics.kpiAvgScore")} fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Student table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("admin.analytics.byStudent")}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-surface-2 text-left text-xs font-medium text-text-subtle">
                  <th className="px-4 py-3">{t("admin.analytics.colStudent")}</th>
                  <th className="px-4 py-3 text-center">{t("admin.analytics.colAttendance")}</th>
                  <th className="px-4 py-3 text-center">{t("admin.analytics.colAvgScore")}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.students.map(s => (
                  <tr key={s.student_id} className="hover:bg-surface-2/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-text">{s.full_name}</td>
                    <td className="px-4 py-3 text-center">
                      <ScoreBadge value={s.attendance_rate} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      {s.avg_score != null ? <ScoreBadge value={s.avg_score} /> : <span className="text-text-subtle">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Shared helpers ─────────────────────────────────────────────────

function ScoreBadge({ value }: { value: number }) {
  const color =
    value >= 70 ? "text-emerald-700 bg-emerald-50" :
    value >= 40 ? "text-amber-700 bg-amber-50" :
    "text-red-700 bg-red-50";
  return (
    <span className={`inline-block rounded px-1.5 py-0.5 text-xs font-semibold tabular-nums ${color}`}>
      {value}%
    </span>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <span className="text-text-subtle">{label}</span>
      <span className="ml-1 font-semibold text-text">{value}</span>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-ink-200 py-16 text-center">
      <BarChart3 className="mb-3 h-8 w-8 text-text-subtle" />
      <p className="text-sm text-text-muted">{text}</p>
    </div>
  );
}
