/**
 * Week-planner assembly helpers for the Journal "Schedule" tab.
 *
 * Pure functions that turn the flat slot list from `GET /schedule/week`
 * (typed in schedule.ts as {@link ScheduleSlot}) into a per-day, lane-packed
 * grid layout plus a client-side clash set. The clash rule and greedy lane
 * packing are ported verbatim from the design handoff `scheduler.jsx`
 * (`computeClashes` / `layoutDay`) and DATA_MODEL §2.1:
 *
 *   two slots clash when same day + same room + overlapping time, using the
 *   half-open interval rule `a.start < b.end && b.start < a.end` (touching
 *   edges 09–10 / 10–11 do NOT clash).
 *
 * Teacher double-booking is additive: two slots on the same day with the same
 * teacher and overlapping time also clash (mirrors the backend Phase E1
 * `teacher_conflicts`). Both feed one `Set<slotId>` so a block can light up
 * coral for either reason.
 *
 * Times are "HH:MM" strings (local site time); day_of_week is 0=Mon … 6=Sun.
 */
import type { ScheduleSlot } from "@/lib/api/schedule";

/** Day window for the grid: 9:00 … 18:00, one row per hour. */
export const SCHED_START_HOUR = 9;
export const SCHED_END_HOUR = 18;
export const SCHED_ROW_H = 52;

/** Mon–Sat columns (handoff §6 grid is `46px + 6 day columns`). */
export const SCHED_DAYS = [0, 1, 2, 3, 4, 5] as const;

/** Hour labels down the left gutter (9 … 18 inclusive). */
export const SCHED_HOURS: number[] = Array.from(
  { length: SCHED_END_HOUR - SCHED_START_HOUR + 1 },
  (_, i) => SCHED_START_HOUR + i,
);

/** Parse "HH:MM" → fractional hours (e.g. "09:30" → 9.5). */
export function hhmmToHours(hhmm: string): number {
  const [h, m] = hhmm.split(":");
  const hours = Number(h);
  const mins = Number(m ?? "0");
  if (!Number.isFinite(hours)) return 0;
  return hours + (Number.isFinite(mins) ? mins : 0) / 60;
}

/** A slot placed onto the week grid (with its lane assignment). */
export interface PlacedSlot {
  slot: ScheduleSlot;
  /** Fractional start hour, e.g. 9.5. */
  start: number;
  /** Duration in fractional hours (>= a small floor so zero-length is visible). */
  dur: number;
  /** Greedy-packed column index within the day. */
  lane: number;
  /** Total lanes used in this day (block width = 100 / lanes %). */
  lanes: number;
  /** True when this slot overlaps another in the same room (or by teacher). */
  clash: boolean;
}

/** What identifies the "teacher" of a slot for the double-booking check. */
function teacherKeyOf(s: ScheduleSlot): string | null {
  // The week endpoint does not surface teacher_id directly; group_id is the
  // stand-in (one group → one teacher in Phase B). When a slot has no group we
  // cannot attribute a teacher, so it never contributes a teacher-clash.
  return s.group_id ?? null;
}

/** Half-open overlap test between two slots (touching edges do not clash). */
function slotsOverlap(a: ScheduleSlot, b: ScheduleSlot): boolean {
  return (
    hhmmToHours(a.start_time) < hhmmToHours(b.end_time) &&
    hhmmToHours(b.start_time) < hhmmToHours(a.end_time)
  );
}

/** A clashing pair: same day + overlap + (same room OR same teacher). */
function slotsClash(a: ScheduleSlot, b: ScheduleSlot): boolean {
  if (a.day_of_week !== b.day_of_week) return false;
  if (!slotsOverlap(a, b)) return false;
  const sameRoom = a.room_id != null && a.room_id === b.room_id;
  const tA = teacherKeyOf(a);
  const sameTeacher = tA != null && tA === teacherKeyOf(b);
  return sameRoom || sameTeacher;
}

/**
 * Clash detection over a week's slots (ported from `computeClashes`).
 *
 * Returns the set of slot ids that participate in at least one clash — same
 * day + same room + overlap (room double-booking), OR same day + same teacher
 * + overlap (teacher double-booking). Only active slots are considered.
 */
export function computeWeekClashes(slots: ScheduleSlot[]): Set<string> {
  const clash = new Set<string>();
  const active = slots.filter((s) => s.active);
  for (let i = 0; i < active.length; i += 1) {
    for (let j = i + 1; j < active.length; j += 1) {
      if (slotsClash(active[i], active[j])) {
        clash.add(active[i].id);
        clash.add(active[j].id);
      }
    }
  }
  return clash;
}

/**
 * Greedy lane assignment within one day (ported from `layoutDay`): slots are
 * sorted by start; each is dropped into the first lane whose previous block
 * has ended, else a new lane is opened. Returns the day's placed slots with
 * `lane` / `lanes` filled in.
 */
export function layoutDay(
  daySlots: ScheduleSlot[],
  clash: Set<string>,
): PlacedSlot[] {
  const placed: PlacedSlot[] = daySlots
    .map((slot) => {
      const start = hhmmToHours(slot.start_time);
      const end = hhmmToHours(slot.end_time);
      return {
        slot,
        start,
        // Floor at 0.25h so a degenerate/zero-length slot is still clickable.
        dur: Math.max(end - start, 0.25),
        lane: 0,
        lanes: 1,
        clash: clash.has(slot.id),
      };
    })
    .sort((a, b) => a.start - b.start);

  const laneEnds: number[] = [];
  for (const p of placed) {
    let assigned = false;
    for (let c = 0; c < laneEnds.length; c += 1) {
      if (laneEnds[c] <= p.start + 1e-6) {
        p.lane = c;
        laneEnds[c] = p.start + p.dur;
        assigned = true;
        break;
      }
    }
    if (!assigned) {
      p.lane = laneEnds.length;
      laneEnds.push(p.start + p.dur);
    }
  }
  const lanes = Math.max(laneEnds.length, 1);
  for (const p of placed) p.lanes = lanes;
  return placed;
}

/** The whole week, indexed by day_of_week (0=Mon … 5=Sat). */
export interface WeekLayout {
  /** Placed, lane-packed slots per day (only the Mon–Sat columns). */
  byDay: Record<number, PlacedSlot[]>;
  /** Slot ids participating in any clash. */
  clash: Set<string>;
  /** Number of distinct clashing pairs (for the banner count). */
  clashCount: number;
}

/**
 * Assemble a full Mon–Sat week layout from the flat `/schedule/week` slot list:
 * compute clashes once, then lane-pack each day independently.
 */
export function assembleWeek(slots: ScheduleSlot[]): WeekLayout {
  const clash = computeWeekClashes(slots);
  const active = slots.filter((s) => s.active);
  const byDay: Record<number, PlacedSlot[]> = {};
  for (const day of SCHED_DAYS) {
    byDay[day] = layoutDay(
      active.filter((s) => s.day_of_week === day),
      clash,
    );
  }
  // Count distinct clashing pairs for the banner (ids may be shared across
  // multiple pairs, so the set size alone is not the pair count).
  let pairs = 0;
  for (let i = 0; i < active.length; i += 1) {
    for (let j = i + 1; j < active.length; j += 1) {
      if (slotsClash(active[i], active[j])) pairs += 1;
    }
  }
  return { byDay, clash, clashCount: pairs };
}
