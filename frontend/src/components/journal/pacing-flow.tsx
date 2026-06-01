"use client";

/**
 * PacingFlow — "group movement through the program" (plan vs actual).
 *
 * Two views with internal state (board ⇄ timeline):
 *  - PacingBoard: KPI row + a table of every in-scope group with a progress bar
 *    carrying a black "planned-today" marker, next topic + status badge.
 *  - PacingTimeline: a course's scope & sequence as a horizontal topic band
 *    (segment width ∝ planned_lessons), coloured by coverage, with a "today"
 *    marker and a plan/actual drift note.
 *
 * Faithful to the design handoff (tasks/lms-designs/design_handoff_journal/
 * pacing.jsx + README §5) on the existing design tokens. All strings i18n.
 */
import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Route,
  TrendingUp,
} from "lucide-react";

import { useTranslation } from "@/lib/i18n/context";
import { groupColor } from "@/lib/journal-status";
import {
  usePacingBoard,
  usePacingTimeline,
  type PacingBadge,
  type PacingBoardGroup,
  type PacingTimelineTopic,
} from "@/lib/api/pacing";

// Status palette per README: ontrack green / behind coral / ahead sun.
const STATUS_META: Record<
  PacingBadge,
  { bg: string; fg: string; dot: string; bar: string; labelKey: string }
> = {
  ontrack: {
    bg: "bg-green-50",
    fg: "text-green-800",
    dot: "bg-green-600",
    bar: "bg-green-600",
    labelKey: "pacing.status.ontrack",
  },
  behind: {
    bg: "bg-coral-50",
    fg: "text-coral-700",
    dot: "bg-coral-500",
    bar: "bg-coral-500",
    labelKey: "pacing.status.behind",
  },
  ahead: {
    bg: "bg-sun-50",
    fg: "text-sun-700",
    dot: "bg-sun-500",
    bar: "bg-sun-500",
    labelKey: "pacing.status.ahead",
  },
};

export function PacingFlow() {
  const [selected, setSelected] = useState<string | null>(null);
  return selected ? (
    <PacingTimeline groupId={selected} onBack={() => setSelected(null)} />
  ) : (
    <PacingBoard onOpen={setSelected} />
  );
}

// ── Board (all groups) ───────────────────────────────────────────────────────

function PacingBoard({ onOpen }: { onOpen: (groupId: string) => void }) {
  const { t } = useTranslation();
  const { data, isLoading, isError } = usePacingBoard();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-ink-400">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }
  if (isError || !data) {
    return (
      <p className="py-10 text-center text-sm text-coral-700">
        {t("pacing.loadFailed")}
      </p>
    );
  }

  const kpis = [
    {
      key: "ontrack" as const,
      label: t("pacing.status.ontrack"),
      v: data.kpis.ontrack,
      Icon: CheckCircle2,
    },
    {
      key: "behind" as const,
      label: t("pacing.status.behind"),
      v: data.kpis.behind,
      Icon: AlertTriangle,
    },
    {
      key: "ahead" as const,
      label: t("pacing.status.ahead"),
      v: data.kpis.ahead,
      Icon: TrendingUp,
    },
  ];

  if (data.groups.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface p-10 text-center text-sm text-ink-400">
        {t("pacing.noGroups")}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* KPI row */}
      <div className="grid grid-cols-3 gap-3">
        {kpis.map((x) => {
          const m = STATUS_META[x.key];
          return (
            <div
              key={x.key}
              className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4"
            >
              <div
                className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${m.bg} ${m.fg}`}
              >
                <x.Icon className="h-5 w-5" />
              </div>
              <div>
                <div className="text-2xl font-extrabold leading-none text-text">
                  {x.v}
                </div>
                <div className="mt-1 text-[10.5px] font-bold uppercase tracking-wider text-ink-400">
                  {x.label}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Group table */}
      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <div className="grid grid-cols-[230px_1fr_150px_116px_28px] gap-0 border-b border-ink-100 px-5 py-3 font-mono text-[10.5px] font-bold uppercase tracking-wider text-ink-400">
          <span>{t("pacing.col.group")}</span>
          <span>{t("pacing.col.progress")}</span>
          <span>{t("pacing.col.nextTopic")}</span>
          <span className="text-right">{t("pacing.col.status")}</span>
          <span />
        </div>
        {data.groups.map((g, i) => (
          <PacingBoardRow
            key={g.group_id}
            g={g}
            isFirst={i === 0}
            onOpen={() => onOpen(g.group_id)}
          />
        ))}
      </div>

      <div className="flex items-center gap-2 text-[11.5px] text-ink-400">
        <Route className="h-3.5 w-3.5" />
        {t("pacing.boardHint")}
      </div>
    </div>
  );
}

function PacingBoardRow({
  g,
  isFirst,
  onOpen,
}: {
  g: PacingBoardGroup;
  isFirst: boolean;
  onOpen: () => void;
}) {
  const { t } = useTranslation();
  const m = STATUS_META[g.badge];
  const coveredPct = g.total ? (g.covered / g.total) * 100 : 0;
  // "Planned today" marker = where the plan says the group should be, by
  // topic position over total topics.
  const expPct = g.total ? (g.planned_today_pos / g.total) * 100 : 0;
  const color = g.course_id ? groupColor(g.course_id) : "var(--ink-300)";

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`grid w-full grid-cols-[230px_1fr_150px_116px_28px] items-center gap-0 px-5 py-3.5 text-left transition-colors hover:bg-ink-50 ${
        isFirst ? "" : "border-t border-ink-50"
      }`}
    >
      {/* Group name + teacher/room */}
      <div className="flex min-w-0 items-center gap-3">
        <span
          className="h-8 w-2 flex-shrink-0 rounded"
          style={{ background: color }}
        />
        <span className="min-w-0">
          <span className="block truncate text-[13.5px] font-extrabold text-text">
            {g.group_name}
          </span>
          <span className="block text-[11px] font-semibold text-ink-400">
            {[g.teacher_name, g.default_room_name].filter(Boolean).join(" · ") ||
              g.course_title}
          </span>
        </span>
      </div>

      {/* Progress bar with planned-today marker */}
      <div className="pr-7">
        <div className="relative h-3 rounded-full bg-ink-100">
          <div
            className={`h-full rounded-full ${m.bar}`}
            style={{ width: `${coveredPct}%` }}
          />
          <div
            title={t("pacing.plannedToday")}
            className="absolute -top-1 w-0.5 rounded bg-ink-700"
            style={{ height: 20, left: `calc(${expPct}% - 1px)` }}
          >
            <span className="absolute -left-[3px] -top-[5px] h-2 w-2 rounded-full bg-ink-700" />
          </div>
        </div>
        <div className="mt-1.5 flex justify-between">
          <span className="font-mono text-[11px] font-bold text-ink-500">
            {g.covered} / {g.total} {t("pacing.topicsShort")}
          </span>
          {g.badge === "behind" && (
            <span className="text-[11px] font-bold text-coral-700">
              {t("pacing.behindBy")} {Math.abs(g.delta)}
            </span>
          )}
          {g.badge === "ahead" && (
            <span className="text-[11px] font-bold text-sun-700">
              {t("pacing.aheadBy")} {Math.abs(g.delta)}
            </span>
          )}
        </div>
      </div>

      {/* Next topic */}
      <span className="truncate pr-2 text-xs font-semibold text-ink-500">
        {g.next_topic_title || "—"}
      </span>

      {/* Status badge */}
      <span className="flex justify-end">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${m.bg} ${m.fg}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} />
          {t(m.labelKey)}
        </span>
      </span>

      <span className="flex items-center justify-center text-ink-300">
        <ChevronRight className="h-4 w-4" />
      </span>
    </button>
  );
}

// ── Timeline (one group) ─────────────────────────────────────────────────────

function PacingTimeline({
  groupId,
  onBack,
}: {
  groupId: string;
  onBack: () => void;
}) {
  const { t } = useTranslation();
  const { data, isLoading, isError } = usePacingTimeline(groupId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-ink-400">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }
  if (isError || !data) {
    return (
      <div className="space-y-4">
        <BackButton onBack={onBack} label={t("pacing.allGroups")} />
        <p className="py-10 text-center text-sm text-coral-700">
          {t("pacing.loadFailed")}
        </p>
      </div>
    );
  }

  const m = STATUS_META[data.badge];
  const totalLessons = data.total_lessons || 1;
  const kpis = [
    { l: t("pacing.kpi.topicsCovered"), v: `${data.covered} / ${data.total}` },
    {
      l: t("pacing.kpi.currentTopic"),
      v: data.current_topic_title || "—",
      small: true,
    },
    {
      l: t("pacing.kpi.sessions"),
      v: `${data.covered_lessons} / ${data.total_lessons}`,
    },
    { l: t("pacing.kpi.pace"), v: t(m.labelKey), tone: data.badge },
  ];

  const noteText =
    data.badge === "behind"
      ? `${t("pacing.note.behind")} ${Math.abs(data.delta)} ${t("pacing.topicsShort")}.`
      : data.badge === "ahead"
        ? t("pacing.note.ahead")
        : t("pacing.note.ontrack");
  const NoteIcon =
    data.badge === "behind"
      ? AlertTriangle
      : data.badge === "ahead"
        ? TrendingUp
        : CheckCircle2;
  const noteBox =
    data.badge === "behind"
      ? "bg-coral-50 border-coral-300 text-coral-700"
      : data.badge === "ahead"
        ? "bg-sun-50 border-sun-300 text-sun-700"
        : "bg-green-25 border-green-100 text-green-800";
  const noteIconColor =
    data.badge === "behind"
      ? "text-coral-500"
      : data.badge === "ahead"
        ? "text-sun-500"
        : "text-green-600";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <BackButton onBack={onBack} label={t("pacing.allGroups")} />
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${m.bg} ${m.fg}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} />
          {t(m.labelKey)}
        </span>
      </div>

      <div>
        <h2 className="text-lg font-extrabold text-text">
          {t("pacing.timelineTitle")} · {data.group_name}
        </h2>
        <p className="text-sm text-ink-400">{t("pacing.timelineSubtitle")}</p>
      </div>

      {/* 4 KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {kpis.map((x, i) => (
          <div key={i} className="rounded-xl border border-border bg-surface p-4">
            <div className="text-[10.5px] font-bold uppercase tracking-wider text-ink-400">
              {x.l}
            </div>
            <div
              className={`mt-1 font-extrabold leading-tight ${
                x.small ? "text-[15px]" : "text-2xl"
              } ${x.tone ? STATUS_META[x.tone as PacingBadge].fg : "text-text"}`}
            >
              {x.v}
            </div>
          </div>
        ))}
      </div>

      {/* Topic band */}
      <div className="rounded-xl border border-border bg-surface p-5">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-sm font-extrabold text-text">
            {t("pacing.bandTitle")}
          </span>
          <div className="flex gap-3.5 text-[11px] font-semibold text-ink-500">
            <LegendDot className="bg-green-500" label={t("pacing.legend.covered")} />
            <LegendDot className="bg-sun-400" label={t("pacing.legend.current")} />
            <LegendDot
              className="border-2 border-dashed border-green-300"
              label={t("pacing.legend.next")}
            />
            <LegendDot className="bg-ink-100" label={t("pacing.legend.ahead")} />
          </div>
        </div>

        {data.topics.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink-400">
            {t("pacing.noCurriculum")}
          </p>
        ) : (
          <>
            <div className="flex items-stretch gap-1">
              {data.topics.map((topic) => (
                <TimelineSegment
                  key={topic.id}
                  topic={topic}
                  widthPct={(topic.planned_lessons / totalLessons) * 100}
                />
              ))}
            </div>
            {/* today marker by fraction of held sessions */}
            <div className="relative mt-1 h-7">
              <div
                className="absolute top-0 flex -translate-x-1/2 flex-col items-center"
                style={{ left: `${data.today_fraction * 100}%` }}
              >
                <span className="h-2 w-0.5 bg-ink-700" />
                <span className="rounded-full bg-ink-900 px-2 py-0.5 text-[10px] font-bold text-white">
                  {t("pacing.todayMarker")}
                </span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* drift note */}
      <div
        className={`flex items-center gap-3 rounded-xl border p-3.5 ${noteBox}`}
      >
        <NoteIcon className={`h-4.5 w-4.5 flex-shrink-0 ${noteIconColor}`} />
        <span className="text-[12.5px] font-semibold">{noteText}</span>
      </div>
    </div>
  );
}

function TimelineSegment({
  topic,
  widthPct,
}: {
  topic: PacingTimelineTopic;
  widthPct: number;
}) {
  let box = "bg-ink-50 text-ink-400 border border-ink-100";
  if (topic.state === "covered") box = "bg-green-500 text-white";
  else if (topic.state === "current") box = "bg-sun-400 text-ink-900";
  else if (topic.state === "next")
    box = "bg-green-25 text-green-800 border-2 border-dashed border-green-300";

  const dateColor =
    topic.state === "covered" || topic.state === "current"
      ? "text-green-700"
      : "text-ink-300";

  return (
    <div className="min-w-0" style={{ width: `${widthPct}%` }}>
      <div
        className={`relative flex h-[54px] flex-col justify-between overflow-hidden rounded-[10px] px-2.5 py-2 ${box}`}
      >
        <span className="font-mono text-[10px] font-bold opacity-85">
          {String(topic.position).padStart(2, "0")}
        </span>
        <span className="truncate text-[11px] font-bold leading-tight">
          {topic.title}
        </span>
      </div>
      <div
        className={`mt-1 text-center font-mono text-[9.5px] font-semibold ${dateColor}`}
      >
        {topic.covered_date || "—"}
      </div>
    </div>
  );
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-3 w-3 rounded ${className}`} />
      {label}
    </span>
  );
}

function BackButton({ onBack, label }: { onBack: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onBack}
      className="inline-flex items-center gap-1.5 rounded-lg border border-ink-100 bg-paper-2 py-1.5 pl-2 pr-3 text-xs font-bold text-ink-500 transition-colors hover:bg-ink-50"
    >
      <ChevronLeft className="h-4 w-4" />
      {label}
    </button>
  );
}
