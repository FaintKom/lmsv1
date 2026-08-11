/**
 * Who needs the teacher right now.
 *
 * Mid-lesson the teacher works off a laptop and cannot read a 30x8 grid of
 * cells. They need one answer: who to walk over to. This turns the data the
 * task rail already fetches (progress rows + roster) into four counters and
 * a short list of names.
 *
 * ponytail: fixed thresholds, not class-median ones. A median needs
 * time-per-task data we do not collect reliably yet; revisit if these
 * misfire on real lessons.
 */

import type { ProgressRow, RosterMember } from "@/lib/api/live";

/** Attempts on the current task without passing it. */
export const STUCK_ATTEMPTS = 3;
/** Draft untouched for this long with nothing submitted = they stalled. */
export const IDLE_MS = 3 * 60_000;

/** Why a student is on the list. Ordered by how loudly they are asking. */
export type AttentionReason = "signal" | "stuck" | "idle";

const REASON_ORDER: AttentionReason[] = ["signal", "stuck", "idle"];

export interface AttentionEntry {
  id: string;
  name: string;
  reason: AttentionReason;
  /** Attempts on the current task — the teacher's cue for how hard it bit. */
  attempts: number;
}

export interface AttentionSummary {
  solved: number;
  /** Online, still on the task, not flagged. */
  working: number;
  stuck: number;
  /** Passed the current task and already moved on to another one. */
  ahead: number;
  needHelp: AttentionEntry[];
}

export interface AttentionInput {
  rows: ProgressRow[];
  roster: RosterMember[];
  /** The task the teacher is currently running, if any. */
  currentExerciseId: string | null;
  /** Injected so the result is testable. */
  now: number;
}

const EMPTY: AttentionSummary = {
  solved: 0,
  working: 0,
  stuck: 0,
  ahead: 0,
  needHelp: [],
};

export function summarizeAttention({
  rows,
  roster,
  currentExerciseId,
  now,
}: AttentionInput): AttentionSummary {
  if (!rows.length) return EMPTY;

  const byId = new Map(roster.map((m) => [m.id, m]));
  const summary: AttentionSummary = { ...EMPTY, needHelp: [] };

  for (const row of rows) {
    const member = byId.get(row.id);
    const passed = row.passed === true;

    // A raised hand outranks anything we infer — they asked out loud.
    const signalling = member?.signal === "hand" || member?.signal === "confused";
    const stuck = !passed && row.attempts >= STUCK_ATTEMPTS;
    const idle =
      !passed &&
      !row.submitted &&
      row.draft_updated_at !== null &&
      now - Date.parse(row.draft_updated_at) > IDLE_MS;

    if (passed) {
      summary.solved += 1;
      // "Ahead" only counts when they actually walked on to something else;
      // sitting on a solved task is not the same as needing a challenge.
      if (
        member?.exercise_id != null &&
        currentExerciseId != null &&
        member.exercise_id !== currentExerciseId
      ) {
        summary.ahead += 1;
      }
    } else if (stuck) {
      summary.stuck += 1;
    } else if (member?.online) {
      summary.working += 1;
    }

    const reason: AttentionReason | null = signalling
      ? "signal"
      : stuck
        ? "stuck"
        : idle
          ? "idle"
          : null;
    if (reason) {
      summary.needHelp.push({ id: row.id, name: row.name, reason, attempts: row.attempts });
    }
  }

  summary.needHelp.sort(
    (a, b) =>
      REASON_ORDER.indexOf(a.reason) - REASON_ORDER.indexOf(b.reason) ||
      b.attempts - a.attempts ||
      a.name.localeCompare(b.name),
  );
  return summary;
}
