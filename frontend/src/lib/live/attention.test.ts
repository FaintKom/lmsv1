import { describe, expect, it } from "vitest";

import type { ProgressRow, RosterMember } from "@/lib/api/live";
import { IDLE_MS, STUCK_ATTEMPTS, summarizeAttention } from "@/lib/live/attention";

const NOW = Date.parse("2026-08-11T10:00:00.000Z");
const TASK = "task-1";

function row(over: Partial<ProgressRow> & { id: string }): ProgressRow {
  return {
    name: over.id,
    submitted: false,
    passed: null,
    score: null,
    attempts: 0,
    draft_updated_at: null,
    ...over,
  };
}

function member(over: Partial<RosterMember> & { id: string }): RosterMember {
  return {
    name: over.id,
    online: true,
    current_view: "task",
    exercise_id: TASK,
    signal: null,
    ...over,
  };
}

const run = (rows: ProgressRow[], roster: RosterMember[]) =>
  summarizeAttention({ rows, roster, currentExerciseId: TASK, now: NOW });

describe("summarizeAttention", () => {
  it("is empty before anyone has a row", () => {
    expect(run([], [])).toEqual({
      solved: 0,
      working: 0,
      stuck: 0,
      ahead: 0,
      needHelp: [],
    });
  });

  it("flags a student who keeps missing the task", () => {
    const s = run(
      [row({ id: "ann", submitted: true, passed: false, attempts: STUCK_ATTEMPTS })],
      [member({ id: "ann" })],
    );
    expect(s.stuck).toBe(1);
    expect(s.working).toBe(0);
    expect(s.needHelp).toEqual([{ id: "ann", name: "ann", reason: "stuck", attempts: 3 }]);
  });

  it("flags a stalled draft but leaves a fresh one alone", () => {
    const stale = new Date(NOW - IDLE_MS - 1000).toISOString();
    const fresh = new Date(NOW - 5_000).toISOString();
    const s = run(
      [
        row({ id: "stalled", draft_updated_at: stale }),
        row({ id: "typing", draft_updated_at: fresh }),
      ],
      [member({ id: "stalled" }), member({ id: "typing" })],
    );
    expect(s.needHelp.map((e) => e.id)).toEqual(["stalled"]);
    expect(s.working).toBe(2); // both are still counted as at work
  });

  it("lets a raised hand outrank an inferred reason", () => {
    const s = run(
      [row({ id: "bo", submitted: true, passed: false, attempts: 4 })],
      [member({ id: "bo", signal: "hand" })],
    );
    expect(s.needHelp[0].reason).toBe("signal");
    expect(s.stuck).toBe(1); // still counted in the KPI
  });

  it("counts ahead only when the student actually moved on", () => {
    const s = run(
      [
        row({ id: "moved", submitted: true, passed: true, attempts: 1 }),
        row({ id: "sitting", submitted: true, passed: true, attempts: 1 }),
      ],
      [member({ id: "moved", exercise_id: "task-2" }), member({ id: "sitting" })],
    );
    expect(s.solved).toBe(2);
    expect(s.ahead).toBe(1);
  });

  it("sorts the list by urgency, then by how hard the task bit", () => {
    const stale = new Date(NOW - IDLE_MS - 1000).toISOString();
    const s = run(
      [
        row({ id: "idle", draft_updated_at: stale }),
        row({ id: "stuck-3", submitted: true, passed: false, attempts: 3 }),
        row({ id: "stuck-7", submitted: true, passed: false, attempts: 7 }),
        row({ id: "asked", attempts: 0 }),
      ],
      [
        member({ id: "idle" }),
        member({ id: "stuck-3" }),
        member({ id: "stuck-7" }),
        member({ id: "asked", signal: "confused" }),
      ],
    );
    expect(s.needHelp.map((e) => e.id)).toEqual(["asked", "stuck-7", "stuck-3", "idle"]);
  });

  it("ignores an offline student for the working count", () => {
    const s = run([row({ id: "gone" })], [member({ id: "gone", online: false })]);
    expect(s.working).toBe(0);
    expect(s.needHelp).toEqual([]);
  });
});
