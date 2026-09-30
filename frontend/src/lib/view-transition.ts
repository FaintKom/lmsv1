/**
 * The one entry point for View Transitions (MOTION.md §8, research R6).
 *
 * A transition blocks input while it captures the old frame, and in a hidden
 * tab its update callback waits for a frame that never comes. So: skip it
 * when the tab is hidden or the reader asked for less motion, and let a second
 * change finish the running one at once instead of queueing behind it.
 * Callers are reflows where the movement carries meaning (M10, catalog
 * filter); the design ratchet rejects `startViewTransition` anywhere else.
 */
type Transition = { skipTransition(): void; finished: Promise<void> };

let running: Transition | null = null;

export function withViewTransition(update: () => void): void {
  const doc = document as Document & { startViewTransition?: (cb: () => void) => Transition };
  if (running) {
    running.skipTransition();
    running = null;
    update();
    return;
  }
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!doc.startViewTransition || reduced || document.hidden) {
    update();
    return;
  }
  const t = doc.startViewTransition(update);
  running = t;
  t.finished.finally(() => {
    if (running === t) running = null;
  });
}
