import { describe, expect, it } from "vitest";

import { isoOf, mondayOf, shiftISO } from "@/lib/date-iso";

/**
 * The journal's week board drifted because calendar days were printed through
 * `toISOString()` — a UTC instant, one day behind local midnight anywhere east
 * of Greenwich (specs/057).
 *
 * These assertions hold in every timezone with the local-date helpers and break
 * as soon as a calendar day is routed through UTC again. Under `TZ=UTC`, which
 * is what CI runs, the old code satisfied them too — so the reproduction of the
 * original failure lives in the walkthrough measurement (a board opening on
 * Saturday and stepping six days), not here.
 */
describe("calendar days stay local", () => {
  it("moving by zero days changes nothing", () => {
    expect(shiftISO("2026-08-24", 0)).toBe("2026-08-24");
  });

  it("a week later is the same weekday", () => {
    expect(shiftISO("2026-08-24", 7)).toBe("2026-08-31");
    expect(shiftISO("2026-08-24", -7)).toBe("2026-08-17");
  });

  it("steps over a month boundary", () => {
    expect(shiftISO("2026-08-31", 1)).toBe("2026-09-01");
    expect(shiftISO("2026-09-01", -1)).toBe("2026-08-31");
  });

  it("finds Monday from any day of that week", () => {
    // 24 August 2026 is a Monday; the 30th is the Sunday that closes its week.
    expect(mondayOf("2026-08-24")).toBe("2026-08-24");
    expect(mondayOf("2026-08-28")).toBe("2026-08-24");
    expect(mondayOf("2026-08-30")).toBe("2026-08-24");
    expect(mondayOf("2026-08-31")).toBe("2026-08-31");
  });

  it("prints a Date in local terms", () => {
    expect(isoOf(new Date(2026, 7, 5))).toBe("2026-08-05");
  });
});
