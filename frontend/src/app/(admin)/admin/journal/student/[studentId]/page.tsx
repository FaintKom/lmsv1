"use client";

/**
 * Student activity-of-day — full page (design handoff §3 / StudentActivity).
 *
 * "What one student actually did on a given day." Reads `?date=YYYY-MM-DD`
 * (and optional `?group=`) + the `[studentId]` route param, then renders:
 *   - a "← Back" button (router.back() → returns to the journal),
 *   - a header (avatar + name + group/date),
 *   - 5 KPI cards (lessons attended / exercises / correct % / time / XP),
 *   - two columns: lessons-of-day (left) + an event timeline (right).
 *
 * Data: GET /journal/student-activity (compute-only aggregate). Result palette
 * (RES): done·grey / correct·green / partial·sun / wrong·coral / skipped·grey.
 */

import { Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  ChevronLeft,
  Clock,
  ClipboardList,
  Loader2,
  Target,
  CheckCircle2,
  Zap,
} from "lucide-react";

import { useTranslation } from "@/lib/i18n/context";
import { Card, CardContent } from "@/components/ui/card";
import {
  useStudentActivity,
  type ActivityResult,
  type ActivityLesson,
  type StudentActivityResponse,
} from "@/lib/api/student-activity";

// Result palette → Tailwind tokens (mirrors RES in the design handoff).
const RES: Record<
  ActivityResult,
  { dot: string; badgeBg: string; badgeFg: string; labelKey: string }
> = {
  done: {
    dot: "bg-ink-300",
    badgeBg: "bg-ink-50",
    badgeFg: "text-ink-500",
    labelKey: "journal.activity.resDone",
  },
  correct: {
    dot: "bg-green-600",
    badgeBg: "bg-green-50",
    badgeFg: "text-green-800",
    labelKey: "journal.activity.resCorrect",
  },
  partial: {
    dot: "bg-sun-500",
    badgeBg: "bg-sun-50",
    badgeFg: "text-sun-700",
    labelKey: "journal.activity.resPartial",
  },
  wrong: {
    dot: "bg-coral-500",
    badgeBg: "bg-coral-50",
    badgeFg: "text-coral-700",
    labelKey: "journal.activity.resWrong",
  },
  skipped: {
    dot: "bg-ink-200",
    badgeBg: "bg-ink-50",
    badgeFg: "text-ink-400",
    labelKey: "journal.activity.resSkipped",
  },
};

function fmtDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString();
}

function fmtMinutes(seconds: number, minLabel: string): string {
  return `${Math.round(seconds / 60)} ${minLabel}`;
}

function fmtClock(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function StudentActivityPage() {
  // useSearchParams() must sit under a Suspense boundary for the prod build.
  return (
    <Suspense fallback={null}>
      <StudentActivityInner />
    </Suspense>
  );
}

function StudentActivityInner() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useParams<{ studentId: string }>();
  const searchParams = useSearchParams();

  const studentId = params.studentId;
  const date = searchParams.get("date") ?? "";
  const groupId = searchParams.get("group") ?? undefined;

  const query = useStudentActivity(studentId, date, groupId);
  const data = query.data;

  return (
    <div className="px-6 py-5 pb-7">
      <button
        onClick={() => router.back()}
        className="mb-4 inline-flex items-center gap-1.5 rounded-[9px] border border-ink-100 bg-surface px-3 py-1.5 text-xs font-bold text-ink-500 hover:bg-ink-50"
      >
        <ChevronLeft className="h-[15px] w-[15px]" />
        {t("journal.activity.back")}
      </button>

      {query.isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : query.isError || !data ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-text-subtle">
            {t("journal.activity.loadError")}
          </CardContent>
        </Card>
      ) : (
        <ActivityBody data={data} />
      )}
    </div>
  );
}

function ActivityBody({ data }: { data: StudentActivityResponse }) {
  const { t } = useTranslation();
  const k = data.kpis;
  const initial = (data.student.name || "?").charAt(0).toUpperCase();
  const subtitleParts = [data.group_name, fmtDate(data.date)].filter(Boolean);

  const kpis: {
    label: string;
    value: string;
    Icon: typeof CheckCircle2;
    fg: string;
    bg: string;
  }[] = [
    {
      label: t("journal.activity.kpiLessons"),
      value: String(k.lessons_attended),
      Icon: CheckCircle2,
      fg: "text-green-700",
      bg: "bg-green-50",
    },
    {
      label: t("journal.activity.kpiExercises"),
      value: String(k.exercises_done),
      Icon: ClipboardList,
      fg: "text-ink-700",
      bg: "bg-ink-50",
    },
    {
      label: t("journal.activity.kpiCorrect"),
      value: `${k.correct_pct}%`,
      Icon: Target,
      fg: "text-green-700",
      bg: "bg-green-50",
    },
    {
      label: t("journal.activity.kpiTime"),
      value: fmtMinutes(k.time_spent_sec, t("journal.activity.minutes")),
      Icon: Clock,
      fg: "text-ink-700",
      bg: "bg-ink-50",
    },
    {
      label: t("journal.activity.kpiXp"),
      value: String(k.xp_earned),
      Icon: Zap,
      fg: "text-sun-700",
      bg: "bg-sun-100",
    },
  ];

  return (
    <>
      {/* Header */}
      <div className="mb-[18px] flex items-center gap-4">
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-gradient-to-br from-green-500 to-green-700 text-2xl font-extrabold text-white">
          {initial}
        </div>
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold tracking-tight text-text">
            {data.student.name}
          </h1>
          <div className="mt-0.5 text-[13px] text-ink-500">
            {subtitleParts.join(" · ")}
          </div>
        </div>
      </div>

      {/* KPI cards */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="flex items-center gap-3 p-[15px]">
              <div
                className={`grid h-[38px] w-[38px] shrink-0 place-items-center rounded-[11px] ${kpi.bg} ${kpi.fg}`}
              >
                <kpi.Icon className="h-[18px] w-[18px]" />
              </div>
              <div className="min-w-0">
                <div
                  className={`text-xl font-extrabold leading-none tracking-tight ${kpi.fg}`}
                >
                  {kpi.value}
                </div>
                <div className="mt-1 text-[10.5px] font-semibold uppercase tracking-wide text-ink-400">
                  {kpi.label}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Two columns: lessons + event feed */}
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Left — lessons today */}
        <div className="flex min-w-0 flex-col gap-3.5">
          <div className="text-[13px] font-extrabold text-text">
            {t("journal.activity.lessonsToday")}
          </div>
          {data.lessons.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-text-subtle">
                {t("journal.activity.empty")}
              </CardContent>
            </Card>
          ) : (
            data.lessons.map((lesson, i) => (
              <LessonCard
                key={`${lesson.course_id}-${lesson.lesson_id ?? "course"}-${i}`}
                lesson={lesson}
              />
            ))
          )}
        </div>

        {/* Right — event feed */}
        <Card>
          <CardContent className="p-[18px]">
            <div className="mb-3.5 flex items-center gap-1.5">
              <Clock className="h-[15px] w-[15px] text-ink-500" />
              <span className="text-[13px] font-extrabold text-text">
                {t("journal.activity.eventFeed")}
              </span>
            </div>
            <div className="relative pl-[18px]">
              <div className="absolute bottom-1 left-1 top-1 w-0.5 bg-ink-100" />
              {data.timeline.map((ev, i) => {
                const dot =
                  ev.kind === "in"
                    ? "bg-green-600"
                    : RES[ev.kind as ActivityResult]?.dot ?? "bg-ink-300";
                return (
                  <div key={i} className="relative pb-3.5">
                    <span
                      className={`absolute -left-[18px] top-0.5 h-2.5 w-2.5 rounded-full border-2 border-surface ${dot}`}
                    />
                    <div className="font-mono text-[10.5px] font-semibold text-ink-400">
                      {fmtClock(ev.at)}
                    </div>
                    <div className="mt-px text-[12.5px] font-semibold text-ink-700">
                      {ev.text}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function LessonCard({ lesson }: { lesson: ActivityLesson }) {
  const { t } = useTranslation();
  const graded = lesson.exercises.filter((e) => e.result !== "done").length;
  const correct = lesson.exercises.filter((e) => e.result === "correct").length;
  const correctPct = graded ? Math.round((correct / graded) * 100) : null;
  const exCount = lesson.exercises.length;

  return (
    <Card className="overflow-hidden p-0">
      <div
        className={`flex items-center gap-3 bg-ink-50 px-[18px] py-3.5 ${
          lesson.attended ? "border-b border-ink-50" : ""
        }`}
      >
        <span className="h-[30px] w-2 shrink-0 rounded bg-green-600" />
        {lesson.time && (
          <span className="font-mono text-xs font-bold text-ink-700">
            {lesson.time}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-extrabold text-text">
            {lesson.course_title}
          </div>
          {lesson.topic && (
            <div className="truncate text-xs text-ink-500">{lesson.topic}</div>
          )}
        </div>
        {!lesson.attended ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-coral-50 px-2.5 py-1 text-[11px] font-bold text-coral-700">
            <span className="h-1.5 w-1.5 rounded-full bg-coral-500" />
            {t("journal.activity.absent")}
          </span>
        ) : (
          <span className="flex items-center gap-2.5">
            <span className="font-mono text-xs font-bold text-ink-500">
              {exCount} {t("journal.activity.exShort")}
            </span>
            {correctPct != null && (
              <span className="rounded-full bg-green-50 px-2.5 py-1 text-[11px] font-bold text-green-800">
                {correctPct}% {t("journal.activity.correctShort")}
              </span>
            )}
          </span>
        )}
      </div>
      {lesson.attended && exCount > 0 ? (
        <div className="px-2.5 py-2">
          {lesson.exercises.map((ex, i) => {
            const res = RES[ex.result] ?? RES.done;
            return (
              <div
                key={ex.id}
                className={`flex items-center gap-3 px-2 py-2.5 ${
                  i ? "border-t border-ink-50" : ""
                }`}
              >
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${res.dot}`} />
                <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-text">
                  {ex.title}
                </span>
                <span className="font-mono text-[10.5px] font-semibold text-ink-400">
                  {ex.type}
                </span>
                {ex.items && (
                  <span className="min-w-[30px] text-right font-mono text-[11.5px] font-bold text-ink-700">
                    {ex.items}
                  </span>
                )}
                <span
                  className={`inline-flex min-w-[64px] justify-center rounded-full px-2.5 py-1 text-[11px] font-bold ${res.badgeBg} ${res.badgeFg}`}
                >
                  {t(res.labelKey)}
                </span>
              </div>
            );
          })}
        </div>
      ) : !lesson.attended ? (
        <div className="px-[18px] py-4 text-[12.5px] text-ink-400">
          {t("journal.activity.absentBody")}
        </div>
      ) : null}
    </Card>
  );
}
