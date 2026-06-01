/**
 * Shared attendance-status palette + per-course color helpers for the Journal
 * module's three fact-screens (Today agenda, Session detail, Register matrix).
 *
 * Palette is single-sourced here so the chip / cell / dot colors stay identical
 * across screens. Maps the design-handoff status palette onto the GrassLMS
 * Tailwind tokens already declared in globals.css:
 *   present "P" → bg green-100 / text green-800 / dot green-600
 *   late    "L" → bg sun-100   / text sun-700   / dot sun-500
 *   absent  "A" → bg coral-50  / text coral-700 / dot coral-500
 *   excused "E" → bg ink-100   / text ink-500   / dot ink-300
 *
 * UI labels stay localized (Present/Late/Absent/Excused via attendance.* keys);
 * the single-letter chips are language-neutral codes (P/L/A/E).
 */
import type { AttendanceStatus } from "@/lib/api/attendance";

export const ATT_ORDER: AttendanceStatus[] = [
  "present",
  "late",
  "absent",
  "excused",
];

export interface StatusToken {
  /** Language-neutral single-letter cell/chip code. */
  letter: string;
  /** Filled chip/cell background. */
  cell: string;
  /** Filled chip/cell text. */
  text: string;
  /** Status dot color. */
  dot: string;
}

export const ATT_STATUS: Record<AttendanceStatus, StatusToken> = {
  present: {
    letter: "P",
    cell: "bg-green-100 text-green-800",
    text: "text-green-800",
    dot: "bg-green-600",
  },
  late: {
    letter: "L",
    cell: "bg-sun-100 text-sun-700",
    text: "text-sun-700",
    dot: "bg-sun-500",
  },
  absent: {
    letter: "A",
    cell: "bg-coral-50 text-coral-700",
    text: "text-coral-700",
    dot: "bg-coral-500",
  },
  excused: {
    letter: "E",
    cell: "bg-ink-100 text-ink-500",
    text: "text-ink-500",
    dot: "bg-ink-300",
  },
};

/** Cycle a status to the next one (P→L→A→E→P); null starts at present. */
export function nextStatus(
  current: AttendanceStatus | null,
): AttendanceStatus {
  if (current === null) return ATT_ORDER[0];
  const idx = ATT_ORDER.indexOf(current);
  return ATT_ORDER[(idx + 1) % ATT_ORDER.length];
}

/** A "present-ish" status counts toward the present/total tally. */
export function countsPresent(status: AttendanceStatus | null): boolean {
  return status === "present" || status === "late";
}

// ── per-course group color bar ───────────────────────────────────────────
// Stable, warm palette derived from a hash of course_id so every screen draws
// the same group its same color. Inline hex (matches the handoff group bars,
// which are arbitrary decorative colors rather than semantic tokens).
const GROUP_COLORS = [
  "#0a8754", // green-600
  "#f5b800", // sun-500
  "#ff7a5c", // coral-500
  "#2b91ff", // info
  "#7c5cff", // violet
  "#3aa76d", // green-500
  "#ffb02e", // amber
  "#e0566f", // rose
];

/** Deterministic decorative color for a course's group bar. */
export function groupColor(courseId: string): string {
  let hash = 0;
  for (let i = 0; i < courseId.length; i += 1) {
    hash = (hash * 31 + courseId.charCodeAt(i)) >>> 0;
  }
  return GROUP_COLORS[hash % GROUP_COLORS.length];
}
