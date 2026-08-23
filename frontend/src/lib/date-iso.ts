/**
 * Calendar-day arithmetic in the reader's own timezone.
 *
 * The journal used `new Date(iso + "T00:00:00").toISOString().slice(0, 10)`.
 * That parses local midnight and then prints the **UTC** instant: anywhere east
 * of Greenwich the result is the previous day, and every call loses one more.
 * The schedule board showed it plainly (specs/057) — it opened on a window that
 * did not contain today, started on Saturday instead of Monday, and "next week"
 * moved six days instead of seven.
 *
 * A calendar day is not an instant. These helpers stay in local terms from end
 * to end and never round-trip through UTC.
 */

/** `YYYY-MM-DD` of a Date, read in local time. */
export function isoOf(d: Date): string {
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

/** Today, as the reader's own calendar shows it. */
export function todayISO(): string {
  return isoOf(new Date());
}

/** `iso` moved by `days` calendar days. */
export function shiftISO(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  return isoOf(d);
}

/** Monday of the week containing `iso` — weeks start on Monday. */
export function mondayOf(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  const dow = (d.getDay() + 6) % 7; // 0 = Monday … 6 = Sunday
  d.setDate(d.getDate() - dow);
  return isoOf(d);
}
