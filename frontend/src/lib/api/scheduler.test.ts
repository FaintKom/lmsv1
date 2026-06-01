import { describe, expect, it } from "vitest";

import type { ScheduleSlot } from "@/lib/api/schedule";
import {
  assembleWeek,
  computeWeekClashes,
  hhmmToHours,
  layoutDay,
} from "@/lib/api/scheduler";

/**
 * Unit tests for the week-planner assembly: the half-open clash rule
 * (DATA_MODEL §2.1) and the greedy lane packing ported from `scheduler.jsx`.
 */

let seq = 0;
function slot(
  partial: Partial<ScheduleSlot> & {
    day_of_week: number;
    start_time: string;
    end_time: string;
  },
): ScheduleSlot {
  seq += 1;
  return {
    id: partial.id ?? `slot-${seq}`,
    org_id: "org-1",
    course_id: partial.course_id ?? `course-${seq}`,
    group_id: partial.group_id ?? null,
    course_title: partial.course_title ?? "Course",
    day_of_week: partial.day_of_week,
    start_time: partial.start_time,
    end_time: partial.end_time,
    location: "",
    room_id: partial.room_id ?? null,
    room_name: partial.room_name ?? null,
    note: "",
    active: partial.active ?? true,
    is_online: partial.is_online ?? false,
    room_url: null,
  };
}

describe("hhmmToHours", () => {
  it("parses whole and fractional hours", () => {
    expect(hhmmToHours("09:00")).toBe(9);
    expect(hhmmToHours("09:30")).toBe(9.5);
    expect(hhmmToHours("18:15")).toBeCloseTo(18.25);
  });
});

describe("computeWeekClashes", () => {
  it("flags two overlapping slots in the same room", () => {
    const a = slot({ id: "a", room_id: "r1", day_of_week: 1, start_time: "09:00", end_time: "10:00" });
    const b = slot({ id: "b", room_id: "r1", day_of_week: 1, start_time: "09:30", end_time: "10:30" });
    const clash = computeWeekClashes([a, b]);
    expect(clash.has("a")).toBe(true);
    expect(clash.has("b")).toBe(true);
  });

  it("does NOT flag touching edges (09–10 / 10–11)", () => {
    const a = slot({ id: "a", room_id: "r1", day_of_week: 1, start_time: "09:00", end_time: "10:00" });
    const b = slot({ id: "b", room_id: "r1", day_of_week: 1, start_time: "10:00", end_time: "11:00" });
    expect(computeWeekClashes([a, b]).size).toBe(0);
  });

  it("does NOT flag overlap in different rooms / no teacher", () => {
    const a = slot({ id: "a", room_id: "r1", day_of_week: 1, start_time: "09:00", end_time: "10:00" });
    const b = slot({ id: "b", room_id: "r2", day_of_week: 1, start_time: "09:30", end_time: "10:30" });
    expect(computeWeekClashes([a, b]).size).toBe(0);
  });

  it("does NOT flag overlap on different days", () => {
    const a = slot({ id: "a", room_id: "r1", day_of_week: 1, start_time: "09:00", end_time: "10:00" });
    const b = slot({ id: "b", room_id: "r1", day_of_week: 2, start_time: "09:30", end_time: "10:30" });
    expect(computeWeekClashes([a, b]).size).toBe(0);
  });

  it("flags teacher double-booking even across different rooms", () => {
    const a = slot({ id: "a", room_id: "r1", group_id: "g1", day_of_week: 3, start_time: "12:00", end_time: "13:00" });
    const b = slot({ id: "b", room_id: "r2", group_id: "g1", day_of_week: 3, start_time: "12:30", end_time: "13:30" });
    const clash = computeWeekClashes([a, b]);
    expect(clash.has("a")).toBe(true);
    expect(clash.has("b")).toBe(true);
  });

  it("ignores inactive slots", () => {
    const a = slot({ id: "a", room_id: "r1", day_of_week: 1, start_time: "09:00", end_time: "10:00" });
    const b = slot({ id: "b", room_id: "r1", day_of_week: 1, start_time: "09:30", end_time: "10:30", active: false });
    expect(computeWeekClashes([a, b]).size).toBe(0);
  });
});

describe("layoutDay", () => {
  it("puts non-overlapping slots in a single lane", () => {
    const a = slot({ id: "a", day_of_week: 0, start_time: "09:00", end_time: "10:00" });
    const b = slot({ id: "b", day_of_week: 0, start_time: "10:00", end_time: "11:00" });
    const placed = layoutDay([a, b], new Set());
    expect(placed.every((p) => p.lanes === 1)).toBe(true);
    expect(placed.every((p) => p.lane === 0)).toBe(true);
  });

  it("packs two overlapping slots side-by-side into 2 lanes", () => {
    const a = slot({ id: "a", day_of_week: 0, start_time: "09:00", end_time: "10:30" });
    const b = slot({ id: "b", day_of_week: 0, start_time: "10:00", end_time: "11:00" });
    const placed = layoutDay([a, b], new Set());
    expect(placed.every((p) => p.lanes === 2)).toBe(true);
    const lanes = placed.map((p) => p.lane).sort();
    expect(lanes).toEqual([0, 1]);
  });

  it("reuses a freed lane for a later non-overlapping slot", () => {
    // a(9–10) and b(9–10) overlap → 2 lanes; c(10–11) reuses lane 0.
    const a = slot({ id: "a", day_of_week: 0, start_time: "09:00", end_time: "10:00" });
    const b = slot({ id: "b", day_of_week: 0, start_time: "09:00", end_time: "10:00" });
    const c = slot({ id: "c", day_of_week: 0, start_time: "10:00", end_time: "11:00" });
    const placed = layoutDay([a, b, c], new Set());
    expect(placed.every((p) => p.lanes === 2)).toBe(true);
    const cPlaced = placed.find((p) => p.slot.id === "c");
    expect(cPlaced?.lane).toBe(0);
  });

  it("computes start and floored duration", () => {
    const a = slot({ id: "a", day_of_week: 0, start_time: "09:30", end_time: "11:00" });
    const placed = layoutDay([a], new Set());
    expect(placed[0].start).toBe(9.5);
    expect(placed[0].dur).toBe(1.5);
  });

  it("propagates the clash flag from the set", () => {
    const a = slot({ id: "a", day_of_week: 0, start_time: "09:00", end_time: "10:00" });
    const placed = layoutDay([a], new Set(["a"]));
    expect(placed[0].clash).toBe(true);
  });
});

describe("assembleWeek", () => {
  it("buckets slots by day and counts clashing pairs", () => {
    const a = slot({ id: "a", room_id: "r1", day_of_week: 1, start_time: "09:00", end_time: "10:00" });
    const b = slot({ id: "b", room_id: "r1", day_of_week: 1, start_time: "09:30", end_time: "10:30" });
    const c = slot({ id: "c", room_id: "r2", day_of_week: 4, start_time: "14:00", end_time: "15:00" });
    const week = assembleWeek([a, b, c]);
    expect(week.byDay[1].length).toBe(2);
    expect(week.byDay[4].length).toBe(1);
    expect(week.clashCount).toBe(1);
    expect(week.clash.has("a")).toBe(true);
    expect(week.clash.has("c")).toBe(false);
  });

  it("excludes inactive slots from the layout", () => {
    const a = slot({ id: "a", day_of_week: 2, start_time: "09:00", end_time: "10:00", active: false });
    const week = assembleWeek([a]);
    expect(week.byDay[2].length).toBe(0);
  });
});
