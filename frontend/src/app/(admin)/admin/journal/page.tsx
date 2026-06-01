"use client";

/**
 * Unified Journal module (Phase 1 frontend core).
 *
 * Tabs:
 *  - Today    — the day's agenda (one /journal/today call), inline topic edit,
 *               attendance pill, open the session detail slide-over, join online.
 *  - Register — attendance matrix (students × dates) assembled client-side from
 *               /journal/sessions + /attendance, read-only, CSV export.
 *  - Rooms    — stub (filled by the next unit).
 *  - Setup    — stub (filled by the next unit).
 *
 * Schedule + Attendance live here now; their standalone nav links were folded
 * into this single "Journal" entry.
 */

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { isAxiosError } from "axios";
import {
  AlertTriangle,
  BookOpenCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Download,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  Trash2,
  Video,
  X,
} from "lucide-react";

import apiClient from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import { useTranslation } from "@/lib/i18n/context";
import { buildJoinUrl } from "@/lib/meetings";
import { Card, CardContent } from "@/components/ui/card";
import { SessionDetail } from "@/components/journal/session-detail";
import { PacingFlow } from "@/components/journal/pacing-flow";
import {
  useCurriculum,
  useCreateTopic,
  useUpdateTopic,
  useDeleteTopic,
  type CurriculumTopic,
} from "@/lib/api/pacing";
import {
  useJournalToday,
  useJournalSessions,
  useGenerateFromSchedule,
  exportJournalCsv,
  type TodayAgendaRow,
} from "@/lib/api/journal";
import {
  fetchRoster,
  markBulk,
  type AttendanceStatus,
  type RosterRow,
} from "@/lib/api/attendance";
import {
  ATT_STATUS,
  countsPresent,
  groupColor,
  nextStatus,
} from "@/lib/journal-status";
import {
  useCourseSlots,
  useCreateSlot,
  useUpdateSlot,
  useDeleteSlot,
  type RoomConflict,
  type ScheduleSlot,
} from "@/lib/api/schedule";
import {
  useRoomBoard,
  useRooms,
  useCreateRoom,
  useUpdateRoom,
  useDeleteRoom,
  type RoomBoardRoom,
} from "@/lib/api/rooms";

type TabKey = "today" | "register" | "program" | "rooms" | "setup";
const TABS: TabKey[] = ["today", "register", "program", "rooms", "setup"];

interface CourseOption {
  id: string;
  title: string;
}

interface TeacherOption {
  id: string;
  full_name: string;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function shiftISO(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// ── Page ──────────────────────────────────────────────────────────────────

export default function AdminJournalPage() {
  // useSearchParams() must sit under a Suspense boundary for the prod build.
  return (
    <Suspense fallback={null}>
      <JournalModule />
    </Suspense>
  );
}

function JournalModule() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();

  const role = useAuthStore((s) => s.user?.role);
  const isMethodist = useAuthStore((s) => s.user?.is_methodist ?? false);
  // Org-wide reach (admin / methodist) unlocks the cross-teacher filter; a
  // plain teacher only ever sees their own courses (scoped server-side).
  const isManager = role === "super_admin" || role === "admin" || isMethodist;

  const tabParam = searchParams.get("tab") as TabKey | null;
  const activeTab: TabKey =
    tabParam && TABS.includes(tabParam) ? tabParam : "today";

  const setTab = (tab: TabKey) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.replace(`/admin/journal?${params.toString()}`);
  };

  // Shared course list (used by Today filter + Register picker).
  const [courses, setCourses] = useState<CourseOption[]>([]);
  useEffect(() => {
    apiClient
      .get<CourseOption[]>("/admin/courses")
      .then(({ data }) => setCourses(data))
      .catch(() => {});
  }, []);

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-text">
          <BookOpenCheck className="h-6 w-6 text-primary" />
          {t("journal.moduleTitle")}
        </h1>
        <p className="text-base text-text-muted">{t("journal.moduleSubtitle")}</p>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-5 border-b border-border text-sm font-medium">
        {TABS.map((tab) => {
          const isActive = tab === activeTab;
          return (
            <button
              key={tab}
              onClick={() => setTab(tab)}
              className={`-mb-px border-b-2 pb-2 transition-colors ${
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-text-subtle hover:text-text"
              }`}
            >
              {t(`journal.tab.${tab}`)}
            </button>
          );
        })}
      </div>

      {activeTab === "today" && (
        <TodayTab courses={courses} isManager={isManager} />
      )}
      {activeTab === "register" && <RegisterTab courses={courses} />}
      {activeTab === "program" && <PacingFlow />}
      {activeTab === "rooms" && <RoomsTab />}
      {activeTab === "setup" && (
        <SetupTab courses={courses} canManageRooms={isManager} />
      )}
    </div>
  );
}

// ── Today tab ───────────────────────────────────────────────────────────────

interface TodayTabProps {
  courses: CourseOption[];
  isManager: boolean;
}

function TodayTab({ courses, isManager }: TodayTabProps) {
  const { t } = useTranslation();
  const userName = useAuthStore((s) => s.user?.full_name);

  const [date, setDate] = useState(todayISO());
  const [courseFilter, setCourseFilter] = useState("");
  const [teacherFilter, setTeacherFilter] = useState("");
  const [openRow, setOpenRow] = useState<TodayAgendaRow | null>(null);

  // Teacher filter options (admin/methodist only).
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  useEffect(() => {
    if (!isManager) return;
    apiClient
      .get<TeacherOption[]>("/admin/users", { params: { role: "teacher" } })
      .then(({ data }) => setTeachers(data))
      .catch(() => {});
  }, [isManager]);

  const todayQuery = useJournalToday(date, {
    courseId: courseFilter || undefined,
    teacherId: isManager ? teacherFilter || undefined : undefined,
  });

  const agenda = todayQuery.data?.agenda ?? [];

  // Mini-metrics: total lessons today, how many are marked (held + attendance
  // taken), and how many still await marking.
  const lessonsCount = agenda.length;
  const markedCount = agenda.filter(
    (r) => r.session !== null && r.attendance.total > 0,
  ).length;
  const awaitingCount = lessonsCount - markedCount;

  const dateLabel = new Date(date + "T00:00:00").toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const join = (row: TodayAgendaRow) => {
    if (!row.room_url) return;
    // Staff always enter as host on the free Jitsi instance.
    const url = buildJoinUrl(row.room_url, {
      displayName: userName,
      isHost: true,
    });
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="space-y-4">
      {/* Date stepper + filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDate(shiftISO(date, -1))}
            aria-label={t("journal.prevDay")}
            className="flex h-8 w-8 items-center justify-center rounded-pill border border-border-strong bg-surface text-text hover:bg-ink-50"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="min-w-[12rem] text-center text-sm font-semibold text-text">
            {dateLabel}
          </div>
          <button
            onClick={() => setDate(shiftISO(date, 1))}
            aria-label={t("journal.nextDay")}
            className="flex h-8 w-8 items-center justify-center rounded-pill border border-border-strong bg-surface text-text hover:bg-ink-50"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          {date !== todayISO() && (
            <button
              onClick={() => setDate(todayISO())}
              className="rounded-pill border border-border-strong bg-surface px-3 py-1 text-xs font-medium text-text hover:bg-ink-50"
            >
              {t("journal.today")}
            </button>
          )}
        </div>

        {isManager && (
          <div className="flex flex-wrap gap-2 text-xs">
            <select
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              className="rounded-pill border border-border-strong bg-surface px-3 py-1.5 text-text"
            >
              <option value="">{t("journal.allCourses")}</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
            <select
              value={teacherFilter}
              onChange={(e) => setTeacherFilter(e.target.value)}
              className="rounded-pill border border-border-strong bg-surface px-3 py-1.5 text-text"
            >
              <option value="">{t("journal.allTeachers")}</option>
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.full_name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Mini-metrics */}
      <div className="flex gap-2.5">
        {[
          {
            key: "lessons",
            label: t("journal.metricLessons"),
            value: lessonsCount,
            color: "text-ink-900",
          },
          {
            key: "marked",
            label: t("journal.metricMarked"),
            value: markedCount,
            color: "text-green-700",
          },
          {
            key: "awaiting",
            label: t("journal.metricAwaiting"),
            value: awaitingCount,
            color: "text-coral-700",
          },
        ].map((m) => (
          <Card key={m.key} className="flex-1">
            <CardContent className="flex items-center justify-between px-3.5 py-3">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-400">
                {m.label}
              </span>
              <span className={`text-2xl font-extrabold tracking-tight ${m.color}`}>
                {m.value}
              </span>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Agenda */}
      {todayQuery.isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : agenda.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-text-subtle">
            {t("journal.noSlotsToday")}
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          {agenda.map((row, i) => (
            <AgendaRow
              key={row.slot_id}
              row={row}
              date={date}
              isFirst={i === 0}
              onOpen={() => setOpenRow(row)}
              onJoin={() => join(row)}
            />
          ))}
        </Card>
      )}
      <p className="text-[11.5px] text-ink-400">{t("journal.agendaHint")}</p>

      {openRow && (
        <SessionDetail
          courseId={openRow.course_id}
          date={date}
          courseTitle={openRow.course_title}
          timeLabel={`${openRow.start_time}–${openRow.end_time}`}
          roomLabel={openRow.room_name}
          isOnline={openRow.is_online}
          onClose={() => setOpenRow(null)}
        />
      )}
    </div>
  );
}

// ── Agenda row (with inline topic that upserts on blur) ─────────────────────

interface AgendaRowProps {
  row: TodayAgendaRow;
  date: string;
  isFirst: boolean;
  onOpen: () => void;
  onJoin: () => void;
}

function AgendaRow({ row, date, isFirst, onOpen, onJoin }: AgendaRowProps) {
  const { t } = useTranslation();
  const [topic, setTopic] = useState(row.session?.topic ?? "");
  const [savedTopic, setSavedTopic] = useState(row.session?.topic ?? "");
  const [saving, setSaving] = useState(false);

  // Upsert held=true + topic for this course+date when the input loses focus
  // and the value actually changed.
  const saveTopic = async () => {
    const next = topic.trim();
    if (next === savedTopic.trim()) return;
    setSaving(true);
    try {
      await apiClient.post("/journal/sessions", {
        course_id: row.course_id,
        session_date: date,
        held: true,
        topic: next,
        notes: null,
      });
      setSavedTopic(next);
      toast.success(t("journal.topicSaved"));
    } catch {
      toast.error(t("journal.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const marked = row.attendance.total > 0 && row.session !== null;
  const bar = groupColor(row.course_id);

  return (
    <div
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      className={`grid cursor-pointer grid-cols-[84px_minmax(150px,1.3fr)_116px_minmax(120px,1fr)_132px] items-center gap-3.5 px-5 py-[15px] transition-colors hover:bg-ink-50 ${
        isFirst ? "" : "border-t border-ink-50"
      }`}
    >
      {/* Time */}
      <span className="font-mono text-[12.5px] font-bold text-ink-700">
        {row.start_time}–{row.end_time}
      </span>

      {/* Group color bar + course + teacher */}
      <div className="flex min-w-0 items-center gap-2.5">
        <span
          className="h-9 w-2 shrink-0 rounded"
          style={{ backgroundColor: bar }}
        />
        <div className="min-w-0">
          <div className="truncate text-sm font-extrabold text-text">
            {row.course_title}
          </div>
          {row.teacher_name ? (
            <div className="truncate text-[11.5px] font-semibold text-ink-400">
              {row.teacher_name}
            </div>
          ) : null}
        </div>
      </div>

      {/* Room */}
      <span
        className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
          row.is_online ? "text-info" : "text-ink-500"
        }`}
      >
        {row.is_online ? (
          <>
            <Video className="h-3.5 w-3.5" /> {t("journal.online")}
          </>
        ) : row.room_name ? (
          <>
            <MapPin className="h-3.5 w-3.5" /> {row.room_name}
          </>
        ) : (
          <span className="text-ink-300">—</span>
        )}
      </span>

      {/* Topic (inline-editable, upsert on blur). Clicks must not bubble to
          the row open handler. */}
      <input
        value={topic}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        onChange={(e) => setTopic(e.target.value)}
        onBlur={saveTopic}
        placeholder={t("journal.topicPlaceholder")}
        maxLength={500}
        className="min-w-0 rounded-lg border border-ink-100 bg-surface px-2 py-1 text-[12.5px] text-ink-700"
      />

      {/* Status + chevron */}
      <div className="flex items-center justify-end gap-3">
        {saving ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-ink-400" />
        ) : marked ? (
          <span className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-green-700">
            <span className="h-2 w-2 rounded-full bg-green-600" />
            {row.attendance.present}/{row.attendance.total}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-ink-400">
            <span className="h-2 w-2 rounded-full border-2 border-ink-300" />
            {t("journal.notMarked")}
          </span>
        )}
        {row.is_online && row.room_url ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onJoin();
            }}
            className="shrink-0 rounded-pill border border-primary px-2.5 py-1 text-[11px] font-semibold text-primary hover:bg-primary/10"
          >
            {t("journal.join")}
          </button>
        ) : null}
        <ChevronRight className="h-4 w-4 shrink-0 text-ink-300" />
      </div>
    </div>
  );
}

// ── Register tab (attendance matrix, read-only v1) ──────────────────────────

interface RegisterTabProps {
  courses: CourseOption[];
}

interface AttendanceApiRecord {
  student_id: string;
  session_date: string | null;
  status: AttendanceStatus;
}

function RegisterTab({ courses }: RegisterTabProps) {
  const { t } = useTranslation();

  const [courseId, setCourseId] = useState("");
  const sessionsQuery = useJournalSessions(courseId);

  // Students (rows) come from the roster of the most recent session date (or
  // today if there are none); attendance records fill the cells.
  const [students, setStudents] = useState<RosterRow[]>([]);
  const [records, setRecords] = useState<AttendanceApiRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Optimistic cell overrides applied on top of fetched records:
  // `studentId|date` -> status. Click cycles a cell and batch-upserts it.
  const [overrides, setOverrides] = useState<Map<string, AttendanceStatus>>(
    new Map(),
  );

  const sessions = sessionsQuery.data?.sessions ?? [];
  const latestSessionDate =
    sessions.length > 0 ? sessions[sessions.length - 1].session_date : "";

  useEffect(() => {
    if (!courseId) {
      setStudents([]);
      setRecords([]);
      setOverrides(new Map());
      return;
    }
    let cancelled = false;
    setLoading(true);
    setOverrides(new Map());
    const rosterDate = latestSessionDate || todayISO();
    Promise.all([
      fetchRoster(courseId, rosterDate),
      apiClient.get<{ records: AttendanceApiRecord[] }>("/attendance", {
        params: { course_id: courseId },
      }),
    ])
      .then(([roster, recordsRes]) => {
        if (cancelled) return;
        setStudents(roster.roster);
        setRecords(recordsRes.data.records ?? []);
      })
      .catch(() => {
        if (!cancelled) {
          setStudents([]);
          setRecords([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // Re-assemble when the course or the latest known session date changes.
  }, [courseId, latestSessionDate]);

  // Build the lookup: studentId|date -> status (fetched records, then any
  // optimistic overrides on top).
  const cellMap = new Map<string, AttendanceStatus>();
  for (const r of records) {
    if (r.session_date)
      cellMap.set(`${r.student_id}|${r.session_date}`, r.status);
  }
  for (const [k, v] of overrides) cellMap.set(k, v);

  const dates = sessions.map((s) => s.session_date);

  // Click a cell → cycle P→L→A→E, apply optimistically, batch-upsert. On
  // failure the override is rolled back.
  const cycleCell = (studentId: string, date: string) => {
    const key = `${studentId}|${date}`;
    const current = cellMap.get(key) ?? null;
    const next = nextStatus(current);
    setOverrides((m) => {
      const copy = new Map(m);
      copy.set(key, next);
      return copy;
    });
    markBulk([
      { student_id: studentId, course_id: courseId, session_date: date, status: next },
    ]).catch(() => {
      setOverrides((m) => {
        const copy = new Map(m);
        if (current === null) copy.delete(key);
        else copy.set(key, current);
        return copy;
      });
      toast.error(t("journal.saveFailed"));
    });
  };

  // Per-student attendance %, and a risk roll-up for the side panel.
  const studentStats = students.map((stu) => {
    let present = 0;
    let absent = 0;
    let late = 0;
    for (const d of dates) {
      const status = cellMap.get(`${stu.student_id}|${d}`) ?? null;
      if (countsPresent(status)) present += 1;
      if (status === "absent") absent += 1;
      if (status === "late") late += 1;
    }
    const pct = dates.length ? Math.round((present / dates.length) * 100) : 0;
    return { stu, present, absent, late, pct };
  });
  const avgPct = studentStats.length
    ? Math.round(
        studentStats.reduce((acc, s) => acc + s.pct, 0) / studentStats.length,
      )
    : 0;
  const atRisk = studentStats
    .filter((s) => s.pct < 85)
    .sort((a, b) => a.pct - b.pct)
    .slice(0, 6);

  // Per-date present totals for the table footer.
  const colTotals = dates.map(
    (d) =>
      students.filter((stu) =>
        countsPresent(cellMap.get(`${stu.student_id}|${d}`) ?? null),
      ).length,
  );

  const pctColor = (p: number) =>
    p >= 85 ? "bg-green-600" : p >= 70 ? "bg-sun-500" : "bg-coral-500";

  const handleExport = async () => {
    if (!courseId || dates.length === 0) return;
    setIsExporting(true);
    try {
      const blob = await exportJournalCsv(
        courseId,
        dates[0],
        dates[dates.length - 1],
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `register-${dates[0]}_${dates[dates.length - 1]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast.error(t("journal.exportFailed"));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <select
          value={courseId}
          onChange={(e) => setCourseId(e.target.value)}
          className="rounded-pill border border-border-strong bg-surface px-3 py-1.5 text-sm text-text"
        >
          <option value="">{t("journal.selectCourse")}</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
        <button
          onClick={handleExport}
          disabled={isExporting || !courseId || dates.length === 0}
          className="flex items-center gap-1.5 rounded-pill border border-border-strong bg-surface px-3 py-1.5 text-xs font-medium text-text hover:bg-ink-50 disabled:opacity-50"
        >
          {isExporting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Download className="h-3.5 w-3.5" />
          )}
          {t("journal.exportCsv")}
        </button>
      </div>

      {!courseId ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-text-subtle">
            {t("journal.pickCoursePrompt")}
          </CardContent>
        </Card>
      ) : loading || sessionsQuery.isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : dates.length === 0 || students.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-text-subtle">
            {t("journal.noRegisterData")}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_236px]">
          {/* Matrix */}
          <div className="flex min-w-0 flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <MatrixLegend />
              <span className="text-[11.5px] text-ink-400">
                {t("journal.clickCycleHint")}
              </span>
            </div>
            <Card className="overflow-auto p-0">
              <table className="w-full border-separate border-spacing-0 tabular-nums">
                <thead>
                  <tr>
                    <th className="sticky left-0 top-0 z-30 min-w-[170px] border-b-[1.5px] border-r-[1.5px] border-ink-100 bg-surface p-3 text-left font-mono text-[11px] font-bold uppercase tracking-wide text-ink-500">
                      {t("journal.student")}
                    </th>
                    {dates.map((d) => {
                      const wd = new Date(d + "T00:00:00").toLocaleDateString(
                        undefined,
                        { weekday: "short" },
                      );
                      return (
                        <th
                          key={d}
                          className="sticky top-0 z-20 min-w-[52px] border-b-[1.5px] border-ink-100 bg-surface px-1 py-2"
                        >
                          <div className="text-xs font-extrabold text-ink-900">
                            {d.slice(5)}
                          </div>
                          <div className="font-mono text-[9px] font-semibold text-ink-400">
                            {wd}
                          </div>
                        </th>
                      );
                    })}
                    <th className="sticky right-0 top-0 z-30 border-b-[1.5px] border-l-[1.5px] border-ink-100 bg-surface px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-wide text-ink-500">
                      {t("journal.attShort")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {studentStats.map(({ stu, pct }) => (
                    <tr key={stu.student_id}>
                      <td className="sticky left-0 z-10 h-[38px] whitespace-nowrap border-b border-r-[1.5px] border-ink-50 border-r-ink-100 bg-surface px-3.5 text-[13px] font-semibold text-ink-900">
                        {stu.student_name}
                      </td>
                      {dates.map((d) => {
                        const status =
                          cellMap.get(`${stu.student_id}|${d}`) ?? null;
                        const token = status ? ATT_STATUS[status] : null;
                        return (
                          <td
                            key={d}
                            className="border-b border-ink-50 p-[3px] text-center"
                          >
                            <button
                              onClick={() => cycleCell(stu.student_id, d)}
                              title={
                                status
                                  ? t(`attendance.statusValue.${status}`)
                                  : t("journal.notMarked")
                              }
                              className={`h-[30px] w-full rounded-md font-mono text-xs font-extrabold transition-colors ${
                                token
                                  ? token.cell
                                  : "bg-surface text-ink-300 hover:bg-ink-50"
                              }`}
                            >
                              {token ? token.letter : "·"}
                            </button>
                          </td>
                        );
                      })}
                      <td className="sticky right-0 z-10 border-b border-l-[1.5px] border-ink-50 border-l-ink-100 bg-surface px-3">
                        <div className="flex items-center justify-end gap-2">
                          <div className="h-1.5 w-[42px] overflow-hidden rounded-full bg-ink-100">
                            <div
                              className={`h-full ${pctColor(pct)}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="min-w-[30px] text-right text-xs font-extrabold text-ink-700">
                            {pct}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td className="sticky left-0 z-10 border-r-[1.5px] border-t-[1.5px] border-ink-100 bg-ink-50 px-3.5 py-2.5 font-mono text-[11px] font-bold uppercase tracking-wide text-ink-500">
                      {t("journal.presentFrom")} {students.length}
                    </td>
                    {colTotals.map((tot, i) => (
                      <td
                        key={dates[i]}
                        className={`border-t-[1.5px] border-ink-100 bg-ink-50 px-1 py-2.5 text-center text-xs font-extrabold ${
                          tot >= students.length - 1
                            ? "text-green-700"
                            : tot <= students.length - 3
                              ? "text-coral-700"
                              : "text-ink-700"
                        }`}
                      >
                        {tot}
                      </td>
                    ))}
                    <td className="sticky right-0 z-10 border-l-[1.5px] border-t-[1.5px] border-ink-100 bg-ink-50" />
                  </tr>
                </tfoot>
              </table>
            </Card>
          </div>

          {/* Risk panel */}
          <div className="flex flex-col gap-3">
            <Card>
              <CardContent className="px-4 py-4">
                <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-400">
                  {t("journal.avgAttendance")}
                </div>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span
                    className={`text-[34px] font-extrabold tracking-tight ${
                      avgPct >= 85 ? "text-green-700" : "text-sun-700"
                    }`}
                  >
                    {avgPct}%
                  </span>
                  <span className="text-xs font-bold text-ink-400">
                    {t("journal.forPeriod")}
                  </span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="px-4 py-4">
                <div className="mb-3 flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-coral-500" />
                  <span className="text-[13px] font-extrabold text-text">
                    {t("journal.atRisk")}
                  </span>
                  <span className="ml-auto font-mono text-[11px] font-bold text-ink-400">
                    &lt; 85%
                  </span>
                </div>
                {atRisk.length === 0 ? (
                  <p className="text-xs text-ink-400">{t("journal.noAtRisk")}</p>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    {atRisk.map(({ stu, absent, late, pct }) => (
                      <div
                        key={stu.student_id}
                        className="flex items-center gap-2.5"
                      >
                        <span className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full bg-coral-50 text-xs font-extrabold text-coral-700">
                          {stu.student_name.charAt(0)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[12.5px] font-bold text-text">
                            {stu.student_name}
                          </div>
                          <div className="text-[10.5px] font-semibold text-ink-400">
                            {absent} {t("journal.missesShort")}
                            {late ? ` · ${late} ${t("journal.latesShort")}` : ""}
                          </div>
                        </div>
                        <span className="text-[13px] font-extrabold text-coral-700">
                          {pct}%
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

// Attendance status legend (P/L/A/E chips + localized labels).
function MatrixLegend() {
  const { t } = useTranslation();
  const order: AttendanceStatus[] = ["present", "late", "absent", "excused"];
  return (
    <div className="flex flex-wrap items-center gap-3.5">
      {order.map((s) => {
        const token = ATT_STATUS[s];
        return (
          <span
            key={s}
            className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-ink-500"
          >
            <span
              className={`grid h-4 w-4 place-items-center rounded font-mono text-[10px] font-extrabold ${token.cell}`}
            >
              {token.letter}
            </span>
            {t(`attendance.statusValue.${s}`)}
          </span>
        );
      })}
    </div>
  );
}

// ── Rooms tab (room × time board) ───────────────────────────────────────────

const DOW_KEYS = [0, 1, 2, 3, 4, 5, 6] as const;

function RoomsTab() {
  const { t } = useTranslation();
  const [date, setDate] = useState(todayISO());
  const boardQuery = useRoomBoard(date);

  const board = boardQuery.data;
  const rooms = board?.rooms ?? [];
  const conflicts = board?.conflicts ?? [];

  // slot_ids that are part of any clash → red outline + ⚠ on that cell.
  const conflictSlotIds = new Set<string>();
  for (const c of conflicts) for (const id of c.slot_ids) conflictSlotIds.add(id);

  // Distinct start times across all rooms → the board's columns.
  const times = Array.from(
    new Set(rooms.flatMap((r) => r.slots.map((s) => s.start_time))),
  ).sort();

  const dateLabel = new Date(date + "T00:00:00").toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDate(shiftISO(date, -1))}
            aria-label={t("journal.prevDay")}
            className="flex h-8 w-8 items-center justify-center rounded-pill border border-border-strong bg-surface text-text hover:bg-ink-50"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="min-w-[9rem] text-center text-sm font-semibold text-text">
            {t("journal.roomBoardFor")} {dateLabel}
          </div>
          <button
            onClick={() => setDate(shiftISO(date, 1))}
            aria-label={t("journal.nextDay")}
            className="flex h-8 w-8 items-center justify-center rounded-pill border border-border-strong bg-surface text-text hover:bg-ink-50"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          {date !== todayISO() && (
            <button
              onClick={() => setDate(todayISO())}
              className="rounded-pill border border-border-strong bg-surface px-3 py-1 text-xs font-medium text-text hover:bg-ink-50"
            >
              {t("journal.today")}
            </button>
          )}
        </div>
        {/* Legend */}
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded bg-success-soft" />
            {t("journal.legendOccupied")}
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded bg-danger-soft outline outline-1 outline-danger-fg" />
            {t("journal.legendClash")}
          </span>
        </div>
      </div>

      {boardQuery.isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : rooms.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-text-subtle">
            {t("journal.roomBoardEmpty")}
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-auto rounded-xl border border-border bg-surface">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-text-subtle">
                <th className="p-2 text-left">{t("journal.room")}</th>
                {times.map((time) => (
                  <th key={time} className="p-2 text-center font-medium">
                    {time}
                  </th>
                ))}
                <th className="p-2 text-center">{t("journal.utilization")}</th>
              </tr>
            </thead>
            <tbody>
              {rooms.map((room) => (
                <RoomBoardRow
                  key={room.room_id}
                  room={room}
                  times={times}
                  conflictSlotIds={conflictSlotIds}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-text-subtle">{t("journal.roomBoardHint")}</p>
    </div>
  );
}

function RoomBoardRow({
  room,
  times,
  conflictSlotIds,
}: {
  room: RoomBoardRoom;
  times: string[];
  conflictSlotIds: Set<string>;
}) {
  // Map this room's slots by their start time for O(1) cell lookup.
  const byTime = new Map<string, RoomBoardRoom["slots"]>();
  for (const s of room.slots) {
    const list = byTime.get(s.start_time) ?? [];
    list.push(s);
    byTime.set(s.start_time, list);
  }
  // Utilization % = occupied period-columns / total period-columns.
  const occupiedCols = times.filter((time) => byTime.has(time)).length;
  const utilPct = times.length
    ? Math.round((occupiedCols / times.length) * 100)
    : 0;

  return (
    <tr className="border-t border-border">
      <td className="p-2 font-medium text-text">
        {room.room_name}
        {room.site ? (
          <span className="ml-1 text-text-subtle">{room.site}</span>
        ) : null}
      </td>
      {times.map((time) => {
        const slots = byTime.get(time);
        if (!slots || slots.length === 0) {
          return (
            <td key={time} className="p-1 text-center text-text-subtle">
              ·
            </td>
          );
        }
        const isClash = slots.some((s) => conflictSlotIds.has(s.slot_id));
        const titles = slots.map((s) => s.course_title).join(" / ");
        return (
          <td key={time} className="p-1">
            <div
              className={`rounded px-1 py-1 text-center text-[10px] font-semibold ${
                isClash
                  ? "bg-danger-soft text-danger-fg outline outline-1 outline-danger-fg"
                  : "bg-success-soft text-success-fg"
              }`}
            >
              {isClash ? `⚠ ${titles}` : titles}
            </div>
          </td>
        );
      })}
      <td className="p-2 text-center text-text-muted">{utilPct}%</td>
    </tr>
  );
}

// ── Setup tab (weekly timetable template + rooms management) ─────────────────

interface SetupTabProps {
  courses: CourseOption[];
  canManageRooms: boolean;
}

function SetupTab({ courses, canManageRooms }: SetupTabProps) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <TimetablePanel courses={courses} />
        <RoomsPanel canManage={canManageRooms} />
      </div>
      {canManageRooms && <CurriculumPanel courses={courses} />}
    </div>
  );
}

// ── Curriculum editor (course scope & sequence) ──────────────────────────────

function CurriculumPanel({ courses }: { courses: CourseOption[] }) {
  const { t } = useTranslation();
  const [courseId, setCourseId] = useState("");
  const curriculumQuery = useCurriculum(courseId);
  const createTopic = useCreateTopic(courseId);
  const updateTopic = useUpdateTopic(courseId);
  const deleteTopic = useDeleteTopic(courseId);

  const [newTitle, setNewTitle] = useState("");
  const [newLessons, setNewLessons] = useState("1");

  const topics = curriculumQuery.data?.topics ?? [];

  const addTopic = async () => {
    const title = newTitle.trim();
    if (!courseId || !title) return;
    try {
      await createTopic.mutateAsync({
        course_id: courseId,
        title,
        planned_lessons: Math.max(1, parseInt(newLessons, 10) || 1),
      });
      setNewTitle("");
      setNewLessons("1");
    } catch {
      toast.error(t("journal.saveFailed"));
    }
  };

  const move = async (topic: CurriculumTopic, dir: -1 | 1) => {
    const target = topic.position + dir;
    if (target < 1 || target > topics.length) return;
    try {
      await updateTopic.mutateAsync({
        topicId: topic.id,
        body: { position: target },
      });
    } catch {
      toast.error(t("journal.saveFailed"));
    }
  };

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div>
          <h3 className="text-sm font-extrabold text-text">
            {t("curriculum.title")}
          </h3>
          <p className="text-xs text-ink-400">{t("curriculum.subtitle")}</p>
        </div>

        <select
          value={courseId}
          onChange={(e) => setCourseId(e.target.value)}
          className="w-full max-w-sm rounded-lg border border-border bg-surface px-3 py-2 text-sm"
        >
          <option value="">{t("curriculum.pickCourse")}</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>

        {!courseId ? (
          <p className="py-6 text-center text-sm text-ink-400">
            {t("curriculum.pickCoursePrompt")}
          </p>
        ) : (
          <>
            <div className="divide-y divide-ink-50 rounded-lg border border-border">
              {topics.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-ink-400">
                  {t("curriculum.empty")}
                </p>
              ) : (
                topics.map((topic, i) => (
                  <CurriculumRow
                    key={topic.id}
                    topic={topic}
                    isFirst={i === 0}
                    isLast={i === topics.length - 1}
                    onMoveUp={() => move(topic, -1)}
                    onMoveDown={() => move(topic, 1)}
                    onSave={(body) =>
                      updateTopic
                        .mutateAsync({ topicId: topic.id, body })
                        .catch(() => toast.error(t("journal.saveFailed")))
                    }
                    onDelete={() =>
                      deleteTopic
                        .mutateAsync(topic.id)
                        .catch(() => toast.error(t("journal.saveFailed")))
                    }
                  />
                ))
              )}
            </div>

            {/* Add topic */}
            <div className="flex flex-wrap items-end gap-2">
              <label className="flex-1 min-w-[180px] text-xs font-semibold text-ink-500">
                {t("curriculum.topicTitle")}
                <input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder={t("curriculum.topicPlaceholder")}
                  className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm font-normal text-text"
                />
              </label>
              <label className="w-24 text-xs font-semibold text-ink-500">
                {t("curriculum.lessons")}
                <input
                  type="number"
                  min={1}
                  value={newLessons}
                  onChange={(e) => setNewLessons(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm font-normal text-text"
                />
              </label>
              <button
                type="button"
                onClick={addTopic}
                disabled={!newTitle.trim() || createTopic.isPending}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-bold text-primary-fg disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                {t("curriculum.addTopic")}
              </button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function CurriculumRow({
  topic,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
  onSave,
  onDelete,
}: {
  topic: CurriculumTopic;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onSave: (body: { title?: string; planned_lessons?: number }) => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  const [title, setTitle] = useState(topic.title);
  const [lessons, setLessons] = useState(String(topic.planned_lessons));

  const commitTitle = () => {
    const v = title.trim();
    if (v && v !== topic.title) onSave({ title: v });
  };
  const commitLessons = () => {
    const v = Math.max(1, parseInt(lessons, 10) || 1);
    if (v !== topic.planned_lessons) onSave({ planned_lessons: v });
  };

  return (
    <div className="flex items-center gap-2 px-3 py-2">
      <span className="w-6 text-center font-mono text-[11px] font-bold text-ink-300">
        {String(topic.position).padStart(2, "0")}
      </span>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={commitTitle}
        className="min-w-0 flex-1 rounded border border-transparent bg-transparent px-1.5 py-1 text-sm font-semibold text-text hover:border-border focus:border-border-focus focus:outline-none"
      />
      <label className="flex items-center gap-1 text-[11px] text-ink-400">
        <input
          type="number"
          min={1}
          value={lessons}
          onChange={(e) => setLessons(e.target.value)}
          onBlur={commitLessons}
          className="w-12 rounded border border-border bg-surface px-1.5 py-1 text-center text-xs text-text"
          aria-label={t("curriculum.lessons")}
        />
        <span>{t("curriculum.lessonsShort")}</span>
      </label>
      <button
        type="button"
        onClick={onMoveUp}
        disabled={isFirst}
        aria-label={t("curriculum.moveUp")}
        className="rounded p-1 text-ink-400 hover:bg-ink-50 disabled:opacity-30"
      >
        <ChevronUp className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={onMoveDown}
        disabled={isLast}
        aria-label={t("curriculum.moveDown")}
        className="rounded p-1 text-ink-400 hover:bg-ink-50 disabled:opacity-30"
      >
        <ChevronDown className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={onDelete}
        aria-label={t("curriculum.deleteTopic")}
        className="rounded p-1 text-coral-500 hover:bg-coral-50"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

// Local editable row state for the timetable template.
interface SlotForm {
  day_of_week: number;
  start_time: string;
  end_time: string;
  room_id: string;
  is_online: boolean;
}

function slotToForm(slot: ScheduleSlot): SlotForm {
  return {
    day_of_week: slot.day_of_week,
    start_time: slot.start_time,
    end_time: slot.end_time,
    room_id: slot.room_id ?? "",
    is_online: slot.is_online,
  };
}

/** Pull the 409 room_conflict payload out of an Axios error, or null. */
function readConflicts(err: unknown): RoomConflict[] | null {
  if (!isAxiosError(err) || err.response?.status !== 409) return null;
  const detail = err.response.data?.detail;
  if (detail?.code === "room_conflict" && Array.isArray(detail.conflicts)) {
    return detail.conflicts as RoomConflict[];
  }
  return null;
}

function TimetablePanel({ courses }: { courses: CourseOption[] }) {
  const { t } = useTranslation();
  const [courseId, setCourseId] = useState("");
  const slotsQuery = useCourseSlots(courseId);
  const roomsQuery = useRooms();
  const createSlot = useCreateSlot();
  const updateSlot = useUpdateSlot();
  const deleteSlot = useDeleteSlot();
  const generate = useGenerateFromSchedule(courseId);

  const rooms = roomsQuery.data?.rooms ?? [];
  const slots = slotsQuery.data?.slots ?? [];

  // Draft "add slot" row (null when not adding).
  const [draft, setDraft] = useState<SlotForm | null>(null);

  // Date range for the journal-day generator.
  const [fromDate, setFromDate] = useState(todayISO());
  const [toDate, setToDate] = useState(todayISO());

  // ── Per-row save with clash handling ──────────────────────────────────
  const persistSlot = async (
    slotId: string | null,
    form: SlotForm,
    force: boolean,
  ): Promise<RoomConflict[] | "ok" | "error"> => {
    if (form.end_time <= form.start_time) {
      toast.error(t("schedule.invalidTimes"));
      return "error";
    }
    const body = {
      day_of_week: form.day_of_week,
      start_time: form.start_time,
      end_time: form.end_time,
      room_id: form.room_id || null,
      is_online: form.is_online,
    };
    try {
      if (slotId) {
        await updateSlot.mutateAsync({ slotId, body, force });
      } else {
        await createSlot.mutateAsync({
          body: { course_id: courseId, ...body },
          force,
        });
      }
      toast.success(slotId ? t("schedule.updated") : t("schedule.created"));
      return "ok";
    } catch (err) {
      const conflicts = readConflicts(err);
      if (conflicts) return conflicts;
      toast.error(t("schedule.saveFailed"));
      return "error";
    }
  };

  const handleDelete = (slotId: string) => {
    deleteSlot.mutate(slotId, {
      onSuccess: () => toast.success(t("schedule.deleted")),
      onError: () => toast.error(t("schedule.deleteFailed")),
    });
  };

  const handleGenerate = () => {
    if (!courseId) return;
    if (toDate < fromDate) {
      toast.error(t("journal.generateRangeTooLong"));
      return;
    }
    generate.mutate(
      { course_id: courseId, from_date: fromDate, to_date: toDate },
      {
        onSuccess: (res) => {
          if (res.created > 0) {
            toast.success(t("journal.daysCreated").replace("{count}", String(res.created)));
          } else {
            toast.info(t("journal.noDaysCreated"));
          }
        },
        onError: () => toast.error(t("journal.generateRangeTooLong")),
      },
    );
  };

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-text">
            {t("journal.timetableTitle")}
          </h3>
        </div>

        <select
          value={courseId}
          onChange={(e) => {
            setCourseId(e.target.value);
            setDraft(null);
          }}
          className="w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text"
        >
          <option value="">{t("journal.selectCourse")}</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>

        {!courseId ? (
          <p className="py-4 text-center text-xs text-text-subtle">
            {t("journal.timetablePickCourse")}
          </p>
        ) : slotsQuery.isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-2 text-xs">
            {slots.length === 0 && !draft ? (
              <p className="py-2 text-center text-text-subtle">
                {t("schedule.noSlots")}
              </p>
            ) : null}
            {slots.map((slot) => (
              <SlotRow
                key={slot.id}
                initial={slotToForm(slot)}
                rooms={rooms}
                onSave={(form, force) => persistSlot(slot.id, form, force)}
                onDelete={() => handleDelete(slot.id)}
              />
            ))}
            {draft && (
              <SlotRow
                isNew
                initial={draft}
                rooms={rooms}
                onSave={async (form, force) => {
                  const res = await persistSlot(null, form, force);
                  if (res === "ok") setDraft(null);
                  return res;
                }}
                onDelete={() => setDraft(null)}
              />
            )}
            {!draft && (
              <button
                onClick={() =>
                  setDraft({
                    day_of_week: 0,
                    start_time: "09:00",
                    end_time: "10:00",
                    room_id: "",
                    is_online: false,
                  })
                }
                className="flex items-center gap-1 rounded-pill bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-hover"
              >
                <Plus className="h-3.5 w-3.5" />
                {t("schedule.addSlot")}
              </button>
            )}
          </div>
        )}

        {/* Generate journal days from the schedule */}
        {courseId && (
          <div className="mt-2 space-y-2 border-t border-border pt-3">
            <h4 className="text-xs font-semibold text-text">
              {t("journal.generateFromSchedule")}
            </h4>
            <div className="flex flex-wrap items-end gap-2">
              <label className="flex flex-col gap-1 text-[11px] text-text-muted">
                {t("journal.from")}
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="rounded-lg border border-border-strong px-2 py-1 text-xs"
                />
              </label>
              <label className="flex flex-col gap-1 text-[11px] text-text-muted">
                {t("journal.to")}
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="rounded-lg border border-border-strong px-2 py-1 text-xs"
                />
              </label>
              <button
                onClick={handleGenerate}
                disabled={generate.isPending}
                className="flex items-center gap-1 rounded-pill border border-border-strong bg-surface px-3 py-1.5 text-xs font-medium text-text hover:bg-ink-50 disabled:opacity-50"
              >
                {generate.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : null}
                {t("journal.generate")}
              </button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface SlotRowProps {
  initial: SlotForm;
  rooms: { id: string; name: string }[];
  isNew?: boolean;
  onSave: (form: SlotForm, force: boolean) => Promise<RoomConflict[] | "ok" | "error">;
  onDelete: () => void;
}

function SlotRow({ initial, rooms, isNew, onSave, onDelete }: SlotRowProps) {
  const { t } = useTranslation();
  const [form, setForm] = useState<SlotForm>(initial);
  const [saving, setSaving] = useState(false);
  const [conflicts, setConflicts] = useState<RoomConflict[] | null>(null);

  const set = (patch: Partial<SlotForm>) => {
    setForm((f) => ({ ...f, ...patch }));
    setConflicts(null);
  };

  const save = async (force: boolean) => {
    setSaving(true);
    const res = await onSave(form, force);
    setSaving(false);
    if (Array.isArray(res)) setConflicts(res);
    else if (res === "ok") setConflicts(null);
  };

  return (
    <div
      className={`space-y-1 border-b border-border pb-2 ${
        conflicts ? "-mx-1 rounded bg-danger-soft/40 px-1" : ""
      }`}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <select
          value={form.day_of_week}
          onChange={(e) => set({ day_of_week: Number(e.target.value) })}
          className="rounded border border-border-strong px-1 py-1"
          aria-label={t("schedule.dayOfWeek")}
        >
          {DOW_KEYS.map((d) => (
            <option key={d} value={d}>
              {t(`schedule.day.${d}`)}
            </option>
          ))}
        </select>
        <input
          type="time"
          value={form.start_time}
          onChange={(e) => set({ start_time: e.target.value })}
          className="rounded border border-border-strong px-1 py-1"
          aria-label={t("schedule.startTime")}
        />
        <input
          type="time"
          value={form.end_time}
          onChange={(e) => set({ end_time: e.target.value })}
          className="rounded border border-border-strong px-1 py-1"
          aria-label={t("schedule.endTime")}
        />
        <select
          value={form.room_id}
          onChange={(e) => set({ room_id: e.target.value })}
          className="flex-1 rounded border border-border-strong px-1 py-1"
          aria-label={t("journal.room")}
        >
          <option value="">{t("journal.roomNone")}</option>
          {rooms.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-1" title={t("journal.online")}>
          <input
            type="checkbox"
            checked={form.is_online}
            onChange={(e) => set({ is_online: e.target.checked })}
            className="h-3.5 w-3.5"
          />
          <Video className="h-3.5 w-3.5 text-text-muted" />
        </label>
        <button
          onClick={() => save(false)}
          disabled={saving}
          className="rounded-pill bg-primary px-2 py-1 text-[11px] font-semibold text-white hover:bg-primary-hover disabled:opacity-50"
          title={isNew ? t("schedule.addSlot") : t("schedule.save")}
        >
          {saving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : isNew ? (
            <Plus className="h-3.5 w-3.5" />
          ) : (
            t("schedule.save")
          )}
        </button>
        <button
          onClick={onDelete}
          className="text-danger-fg hover:opacity-80"
          aria-label={t("schedule.delete")}
        >
          {isNew ? <X className="h-3.5 w-3.5" /> : <Trash2 className="h-3.5 w-3.5" />}
        </button>
      </div>

      {conflicts && (
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-danger-fg">
          <AlertTriangle className="h-3.5 w-3.5" />
          <span>
            {t("journal.roomClashWarning")}{" "}
            {conflicts
              .map((c) => `${c.course_title} (${c.start_time}–${c.end_time})`)
              .join(", ")}
          </span>
          <button
            onClick={() => save(true)}
            disabled={saving}
            className="rounded-pill border border-danger-fg px-2 py-0.5 font-semibold hover:bg-danger-soft disabled:opacity-50"
          >
            {t("journal.saveAnyway")}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Rooms management panel ───────────────────────────────────────────────────

interface RoomFormState {
  name: string;
  capacity: string;
  site: string;
}

const EMPTY_ROOM_FORM: RoomFormState = { name: "", capacity: "", site: "" };

function RoomsPanel({ canManage }: { canManage: boolean }) {
  const { t } = useTranslation();
  const roomsQuery = useRooms();
  const createRoom = useCreateRoom();
  const updateRoom = useUpdateRoom();
  const deleteRoom = useDeleteRoom();

  const rooms = roomsQuery.data?.rooms ?? [];

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<RoomFormState>(EMPTY_ROOM_FORM);
  const [adding, setAdding] = useState(false);

  const resetForm = () => {
    setForm(EMPTY_ROOM_FORM);
    setEditingId(null);
    setAdding(false);
  };

  const startEdit = (id: string, name: string, capacity: number | null, site: string) => {
    setEditingId(id);
    setAdding(false);
    setForm({ name, capacity: capacity == null ? "" : String(capacity), site });
  };

  const submit = () => {
    const name = form.name.trim();
    if (!name) return;
    const body = {
      name,
      capacity: form.capacity.trim() === "" ? null : Number(form.capacity),
      site: form.site.trim(),
    };
    if (editingId) {
      updateRoom.mutate(
        { roomId: editingId, body },
        {
          onSuccess: () => {
            toast.success(t("journal.roomSaved"));
            resetForm();
          },
          onError: () => toast.error(t("journal.roomSaveFailed")),
        },
      );
    } else {
      createRoom.mutate(body, {
        onSuccess: () => {
          toast.success(t("journal.roomSaved"));
          resetForm();
        },
        onError: () => toast.error(t("journal.roomSaveFailed")),
      });
    }
  };

  const handleDelete = (id: string) => {
    deleteRoom.mutate(id, {
      onSuccess: () => {
        toast.success(t("journal.roomDeleted"));
        if (editingId === id) resetForm();
      },
      onError: () => toast.error(t("journal.roomDeleteFailed")),
    });
  };

  const saving = createRoom.isPending || updateRoom.isPending;
  const showForm = canManage && (adding || editingId !== null);

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-text">
            {t("journal.roomsTitle")}
          </h3>
          {canManage && !showForm && (
            <button
              onClick={() => {
                setAdding(true);
                setEditingId(null);
                setForm(EMPTY_ROOM_FORM);
              }}
              className="flex items-center gap-1 rounded-pill bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-hover"
            >
              <Plus className="h-3.5 w-3.5" />
              {t("journal.addRoom")}
            </button>
          )}
        </div>

        {showForm && (
          <div className="space-y-2 rounded-lg border border-border bg-surface-2 p-3 text-xs">
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder={t("journal.roomNamePlaceholder")}
              className="w-full rounded border border-border-strong px-2 py-1"
            />
            <div className="flex gap-2">
              <input
                type="number"
                min={0}
                value={form.capacity}
                onChange={(e) =>
                  setForm((f) => ({ ...f, capacity: e.target.value }))
                }
                placeholder={t("journal.roomCapacityPlaceholder")}
                className="w-1/2 rounded border border-border-strong px-2 py-1"
              />
              <input
                value={form.site}
                onChange={(e) => setForm((f) => ({ ...f, site: e.target.value }))}
                placeholder={t("journal.roomSitePlaceholder")}
                className="w-1/2 rounded border border-border-strong px-2 py-1"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={submit}
                disabled={saving || !form.name.trim()}
                className="flex items-center gap-1 rounded-pill bg-primary px-3 py-1.5 font-semibold text-white hover:bg-primary-hover disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                {t("schedule.save")}
              </button>
              <button
                onClick={resetForm}
                className="rounded-pill bg-ink-100 px-3 py-1.5 font-medium text-text-muted hover:bg-ink-200"
              >
                {t("schedule.cancel")}
              </button>
            </div>
          </div>
        )}

        {roomsQuery.isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : rooms.length === 0 ? (
          <p className="py-2 text-center text-xs text-text-subtle">
            {t("journal.noRooms")}
          </p>
        ) : (
          <div className="space-y-2 text-xs">
            {rooms.map((room) => (
              <div
                key={room.id}
                className="flex items-center gap-2 border-b border-border pb-2"
              >
                <span className="flex-1 font-semibold text-text">
                  {room.name}
                </span>
                <span className="text-text-subtle">
                  {room.capacity == null
                    ? "—"
                    : `${t("journal.capShort")} ${room.capacity}`}
                </span>
                {room.site ? (
                  <span className="text-text-subtle">{room.site}</span>
                ) : null}
                {canManage && (
                  <>
                    <button
                      onClick={() =>
                        startEdit(room.id, room.name, room.capacity, room.site)
                      }
                      className="text-text-muted hover:text-primary"
                      aria-label={t("schedule.edit")}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(room.id)}
                      disabled={deleteRoom.isPending}
                      className="text-danger-fg hover:opacity-80 disabled:opacity-50"
                      aria-label={t("schedule.delete")}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        {!canManage && (
          <p className="text-[11px] text-text-subtle">
            {t("journal.roomsReadOnly")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
