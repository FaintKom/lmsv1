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
import {
  BookOpenCheck,
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  MapPin,
  Video,
} from "lucide-react";

import apiClient from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import { useTranslation } from "@/lib/i18n/context";
import { buildJoinUrl } from "@/lib/meetings";
import { Card, CardContent } from "@/components/ui/card";
import { SessionDetail } from "@/components/journal/session-detail";
import {
  useJournalToday,
  useJournalSessions,
  exportJournalCsv,
  type TodayAgendaRow,
} from "@/lib/api/journal";
import {
  fetchRoster,
  type AttendanceStatus,
  type RosterRow,
} from "@/lib/api/attendance";

type TabKey = "today" | "register" | "rooms" | "setup";
const TABS: TabKey[] = ["today", "register", "rooms", "setup"];

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
      {activeTab === "rooms" && <StubTab label={t("journal.stub.rooms")} />}
      {activeTab === "setup" && <StubTab label={t("journal.stub.setup")} />}
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
        <div className="space-y-2">
          {agenda.map((row) => (
            <AgendaRow
              key={row.slot_id}
              row={row}
              date={date}
              onOpen={() => setOpenRow(row)}
              onJoin={() => join(row)}
            />
          ))}
        </div>
      )}

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
  onOpen: () => void;
  onJoin: () => void;
}

function AgendaRow({ row, date, onOpen, onJoin }: AgendaRowProps) {
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

  return (
    <Card className="transition-colors hover:border-primary">
      <CardContent className="flex flex-wrap items-center gap-3 p-3">
        <div className="w-24 shrink-0 font-mono text-xs text-text-muted">
          {row.start_time}–{row.end_time}
        </div>
        <div className="w-40 shrink-0 text-sm font-semibold text-text">
          {row.course_title}
        </div>
        <div
          className={`flex w-28 shrink-0 items-center gap-1 text-xs ${
            row.is_online ? "font-semibold text-primary" : "text-text-muted"
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
            <span className="text-text-subtle">—</span>
          )}
        </div>
        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          onBlur={saveTopic}
          placeholder={t("journal.topicPlaceholder")}
          maxLength={500}
          className="min-w-[8rem] flex-1 rounded-lg border border-border-strong px-2 py-1 text-xs text-text"
        />
        <div
          className={`w-24 shrink-0 text-center text-xs ${
            marked ? "font-semibold text-primary" : "text-text-subtle"
          }`}
        >
          {saving ? (
            <Loader2 className="mx-auto h-3.5 w-3.5 animate-spin" />
          ) : marked ? (
            `● ${row.attendance.present}/${row.attendance.total}`
          ) : (
            `○ ${t("journal.notMarked")}`
          )}
        </div>
        <button
          onClick={onOpen}
          className="shrink-0 rounded-pill bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-hover"
        >
          {t("journal.takeAttendance")}
        </button>
        {row.is_online && row.room_url && (
          <button
            onClick={onJoin}
            className="shrink-0 rounded-pill border border-primary px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10"
          >
            {t("journal.join")}
          </button>
        )}
      </CardContent>
    </Card>
  );
}

// ── Register tab (attendance matrix, read-only v1) ──────────────────────────

interface RegisterTabProps {
  courses: CourseOption[];
}

const CELL_STYLES: Record<AttendanceStatus, string> = {
  present: "bg-success-soft text-success-fg",
  late: "bg-warning-soft text-warning-fg",
  absent: "bg-danger-soft text-danger-fg",
  excused: "bg-ink-100 text-text-muted",
};

const CELL_LETTER: Record<AttendanceStatus, string> = {
  present: "P",
  late: "L",
  absent: "A",
  excused: "E",
};

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

  const sessions = sessionsQuery.data?.sessions ?? [];
  const latestSessionDate =
    sessions.length > 0 ? sessions[sessions.length - 1].session_date : "";

  useEffect(() => {
    if (!courseId) {
      setStudents([]);
      setRecords([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
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

  // Build the lookup: studentId|date -> status.
  const cellMap = new Map<string, AttendanceStatus>();
  for (const r of records) {
    if (r.session_date)
      cellMap.set(`${r.student_id}|${r.session_date}`, r.status);
  }
  const dates = sessions.map((s) => s.session_date);

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

      <p className="text-xs text-text-subtle">{t("journal.registerReadOnly")}</p>

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
        <div className="overflow-auto rounded-xl border border-border bg-surface">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-text-subtle">
                <th className="p-2 text-left">{t("journal.student")}</th>
                {sessions.map((s) => (
                  <th key={s.id} className="p-2 text-center font-medium">
                    <div>{s.session_date.slice(5)}</div>
                    {s.topic ? (
                      <div className="max-w-[6rem] truncate font-normal text-text-subtle">
                        {s.topic}
                      </div>
                    ) : null}
                  </th>
                ))}
                <th className="p-2 text-center">Σ</th>
              </tr>
            </thead>
            <tbody>
              {students.map((stu) => {
                let present = 0;
                const cells = dates.map((d) => {
                  const status = cellMap.get(`${stu.student_id}|${d}`) ?? null;
                  if (status === "present" || status === "late") present += 1;
                  return status;
                });
                return (
                  <tr key={stu.student_id} className="border-t border-border">
                    <td className="p-2 font-medium text-text">
                      {stu.student_name}
                    </td>
                    {cells.map((status, i) => (
                      <td key={dates[i]} className="p-1 text-center">
                        {status ? (
                          <span
                            className={`inline-block w-7 rounded py-1 font-semibold ${CELL_STYLES[status]}`}
                          >
                            {CELL_LETTER[status]}
                          </span>
                        ) : (
                          <span className="text-text-subtle">·</span>
                        )}
                      </td>
                    ))}
                    <td className="p-2 text-center text-text-muted">
                      {present}/{dates.length}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Stub tabs (filled by the next unit) ─────────────────────────────────────

function StubTab({ label }: { label: string }) {
  const { t } = useTranslation();
  return (
    <Card>
      <CardContent className="py-12 text-center">
        <p className="text-sm font-medium text-text">{label}</p>
        <p className="mt-1 text-xs text-text-subtle">{t("journal.comingSoon")}</p>
      </CardContent>
    </Card>
  );
}
