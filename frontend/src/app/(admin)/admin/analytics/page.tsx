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

const TABS = [
  { key: "overview", label: "Обзор" },
  { key: "students", label: "Студенты" },
  { key: "courses", label: "Курсы" },
  { key: "exercises", label: "Задания" },
  { key: "attendance", label: "Посещаемость" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const RISK_COLORS = { high: "#ef4444", medium: "#f59e0b", low: "#10b981" };
const RISK_BG = { high: "bg-red-50", medium: "bg-amber-50", low: "bg-emerald-50" };
const RISK_TEXT = { high: "text-red-700", medium: "text-amber-700", low: "text-emerald-700" };
const RISK_LABEL = { high: "Высокий", medium: "Средний", low: "Низкий" };
const DIFFICULTY_LABEL: Record<string, string> = { easy: "Лёгкое", medium: "Среднее", hard: "Сложное" };
const DIFFICULTY_BG: Record<string, string> = { easy: "bg-emerald-50", medium: "bg-amber-50", hard: "bg-red-50" };
const DIFFICULTY_TEXT: Record<string, string> = { easy: "text-emerald-700", medium: "text-amber-700", hard: "text-red-700" };
const PIE_COLORS = ["#ef4444", "#f59e0b", "#10b981"];

const EXERCISE_TYPE_LABELS: Record<string, string> = {
  multiple_choice: "Выбор ответа",
  single_choice: "Один ответ",
  true_false: "Верно/Неверно",
  short_answer: "Короткий ответ",
  fill_blank: "Заполни пропуск",
  matching: "Сопоставление",
  ordering: "Упорядочивание",
  code_challenge: "Код",
  essay: "Эссе",
  file_upload: "Загрузка файла",
  video_response: "Видео-ответ",
  audio_response: "Аудио-ответ",
  interactive_widget: "Виджет",
  math_input: "Математика",
  robot_2d: "Робот 2D",
  world_3d: "Мир 3D",
  peer_review: "Peer review",
  group_project: "Групповой проект",
  web_editor: "Веб-редактор",
};

// ── Component ──────────────────────────────────────────────────────

export default function AdminAnalyticsPage() {
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
      { name: "Высокий", value: overview.at_risk_high, fill: RISK_COLORS.high },
      { name: "Средний", value: overview.at_risk_medium, fill: RISK_COLORS.medium },
      { name: "Низкий", value: overview.at_risk_low, fill: RISK_COLORS.low },
    ].filter(d => d.value > 0);
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
          <h1 className="text-2xl font-bold text-text">Аналитика</h1>
          <p className="mt-1 text-sm text-text-muted">Детальный анализ вашей организации</p>
        </div>
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90"
        >
          <Download className="h-4 w-4" />
          Экспорт CSV
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
      {tab === "overview" && <OverviewTab overview={overview} timeline={timeline} riskPieData={riskPieData} courses={courses} />}
      {tab === "students" && (
        <StudentsTab
          risks={filteredRisks}
          riskFilter={riskFilter}
          setRiskFilter={setRiskFilter}
          totalCounts={overview ? { high: overview.at_risk_high, medium: overview.at_risk_medium, low: overview.at_risk_low } : null}
        />
      )}
      {tab === "courses" && (
        <CoursesTab
          courses={courses}
          funnel={funnel}
          selectedCourse={selectedCourse}
          setSelectedCourse={setSelectedCourse}
        />
      )}
      {tab === "exercises" && (
        <ExercisesTab
          exercises={filteredExercises}
          difficultyFilter={difficultyFilter}
          setDifficultyFilter={setDifficultyFilter}
        />
      )}
      {tab === "attendance" && <AttendanceTab data={attendance} />}
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
  overview,
  timeline,
  riskPieData,
  courses,
}: {
  overview: OverviewKPIs | null;
  timeline: ActivityDay[];
  riskPieData: { name: string; value: number; fill: string }[];
  courses: CourseEffectiveness[];
}) {
  if (!overview) return <EmptyState text="Нет данных для отображения" />;

  const chartData = timeline.map(d => ({
    date: d.date.slice(5),
    "Ответов": d.submissions,
    "Активных": d.active_students,
    "Уроков": d.lessons_completed,
  }));

  const topCourses = courses
    .filter(c => c.total_enrolled > 0)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard icon={Users} label="Студентов" value={overview.total_students} />
        <KpiCard
          icon={Activity}
          label="Активных (7д)"
          value={overview.active_7d}
          subtitle={`${overview.total_students > 0 ? Math.round(overview.active_7d / overview.total_students * 100) : 0}% от всех`}
        />
        <KpiCard icon={BookOpen} label="Курсов" value={overview.total_courses} />
        <KpiCard icon={Target} label="Завершаемость" value={`${overview.completion_rate}%`} />
        <KpiCard icon={Award} label="Ср. балл" value={`${overview.avg_score}%`} />
        <KpiCard
          icon={AlertTriangle}
          label="В зоне риска"
          value={overview.at_risk_high + overview.at_risk_medium}
          subtitle={`${overview.at_risk_high} высокий, ${overview.at_risk_medium} средний`}
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
              Активность за 30 дней
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
                  <Area type="monotone" dataKey="Ответов" stroke="#6366f1" fill="url(#gradSub)" strokeWidth={2} />
                  <Area type="monotone" dataKey="Активных" stroke="#10b981" fill="url(#gradActive)" strokeWidth={2} />
                  <Area type="monotone" dataKey="Уроков" stroke="#f59e0b" fill="transparent" strokeWidth={1.5} strokeDasharray="4 4" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState text="Нет данных за последние 30 дней" />
            )}
          </CardContent>
        </Card>

        {/* Risk pie */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Риски студентов
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
              <EmptyState text="Нет данных о рисках" />
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
              Топ курсов по записям
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {topCourses.map(c => (
                <div key={c.course_id} className="rounded-xl border border-ink-100 p-3">
                  <p className="mb-2 text-sm font-semibold text-text line-clamp-2">{c.title}</p>
                  <div className="space-y-1 text-[11px]">
                    <Metric label="Записано" value={c.total_enrolled} />
                    <Metric label="Завершили" value={`${c.completion_rate}%`} />
                    <Metric label="Ср. балл" value={c.avg_score != null ? `${c.avg_score}%` : "—"} />
                    <Metric label="Активных (7д)" value={c.active_7d} />
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
  risks,
  riskFilter,
  setRiskFilter,
  totalCounts,
}: {
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
            {f === "all" ? "Все" : RISK_LABEL[f]}
            {f !== "all" && totalCounts && (
              <span className="ml-1 opacity-60">({totalCounts[f]})</span>
            )}
          </button>
        ))}
      </div>

      {risks.length === 0 ? (
        <EmptyState text="Нет студентов для отображения" />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-surface-2 text-left text-xs font-medium text-text-subtle">
                    <th className="px-4 py-3">Студент</th>
                    <th className="px-4 py-3">Риск</th>
                    <th className="px-4 py-3 text-center">Неактивен (дн.)</th>
                    <th className="px-4 py-3 text-center">Ср. балл</th>
                    <th className="px-4 py-3">Прогресс</th>
                    <th className="px-4 py-3 text-center">Серия</th>
                    <th className="px-4 py-3 text-center">Курсов</th>
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
                          {RISK_LABEL[r.risk_level]}
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
  courses,
  funnel,
  selectedCourse,
  setSelectedCourse,
}: {
  courses: CourseEffectiveness[];
  funnel: LessonFunnel[];
  selectedCourse: string | null;
  setSelectedCourse: (id: string | null) => void;
}) {
  return (
    <div className="space-y-6">
      {courses.length === 0 ? (
        <EmptyState text="Нет курсов для анализа" />
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
                    <Metric label="Записано" value={c.total_enrolled} />
                    <Metric label="Завершили" value={`${c.completion_rate}%`} />
                    <Metric label="Ср. балл" value={c.avg_score != null ? `${c.avg_score}%` : "—"} />
                    <Metric label="Ср. прогресс" value={`${c.avg_progress}%`} />
                    <Metric label="Активных (7д)" value={c.active_7d} />
                    <Metric label="Дней до завершения" value={c.avg_days_to_complete ?? "—"} />
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
                  Воронка уроков
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
                    <Bar dataKey="started" name="Начали" fill="#6366f1" radius={[0, 2, 2, 0]} />
                    <Bar dataKey="completed" name="Завершили" fill="#10b981" radius={[0, 2, 2, 0]} />
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
  exercises,
  difficultyFilter,
  setDifficultyFilter,
}: {
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
            {f === "all" ? "Все" : DIFFICULTY_LABEL[f]}
          </button>
        ))}
      </div>

      {exercises.length === 0 ? (
        <EmptyState text="Нет данных по заданиям" />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-surface-2 text-left text-xs font-medium text-text-subtle">
                    <th className="px-4 py-3">Задание</th>
                    <th className="px-4 py-3">Тип</th>
                    <th className="px-4 py-3">Сложность</th>
                    <th className="px-4 py-3 text-center">Проходимость</th>
                    <th className="px-4 py-3 text-center">Ср. балл</th>
                    <th className="px-4 py-3 text-center">Попыток</th>
                    <th className="px-4 py-3 text-center">Студентов</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {exercises.map(ex => (
                    <tr key={ex.exercise_id} className="hover:bg-surface-2/50 transition-colors">
                      <td className="max-w-[200px] truncate px-4 py-3 font-medium text-text">
                        {ex.title || "Без названия"}
                      </td>
                      <td className="px-4 py-3 text-text-muted">
                        <span className="rounded bg-ink-50 px-1.5 py-0.5 text-[11px]">
                          {EXERCISE_TYPE_LABELS[ex.exercise_type] || ex.exercise_type}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${DIFFICULTY_BG[ex.difficulty]} ${DIFFICULTY_TEXT[ex.difficulty]}`}>
                          {DIFFICULTY_LABEL[ex.difficulty]}
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

function AttendanceTab({ data }: { data: AttendanceData | null }) {
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
    return <EmptyState text="Нет данных о посещаемости. Отмечайте присутствие через модуль посещаемости." />;
  }

  return (
    <div className="space-y-6">
      {/* Summary KPI */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard
          icon={Calendar}
          label="Ср. посещаемость"
          value={data.avg_attendance_rate != null ? `${data.avg_attendance_rate}%` : "—"}
        />
        <KpiCard
          icon={Users}
          label="Студентов с данными"
          value={data.students.length}
        />
        <KpiCard
          icon={AlertTriangle}
          label="Посещаемость <50%"
          value={data.students.filter(s => s.attendance_rate < 50).length}
          color="bg-red-50 text-red-600"
        />
      </div>

      {/* Attendance vs Score chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Посещаемость → Баллы (корреляция)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={buckets}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="range" tick={{ fontSize: 11 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="count" name="Студентов" fill="#6366f1" radius={[4, 4, 0, 0]} />
              <Bar dataKey="avgScore" name="Ср. балл" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Student table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">По студентам</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-surface-2 text-left text-xs font-medium text-text-subtle">
                  <th className="px-4 py-3">Студент</th>
                  <th className="px-4 py-3 text-center">Посещаемость</th>
                  <th className="px-4 py-3 text-center">Ср. балл</th>
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
