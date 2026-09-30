import { afterEach, describe, expect, it, vi } from "vitest";

import { withViewTransition } from "./view-transition";

/**
 * M10 guard (MOTION.md §8). The reflow animation itself needs a real browser;
 * what can break silently is the guard around it: a transition in a hidden tab
 * never runs its update, and one started over another loses the second click.
 */

type FakeTransition = { skipTransition: ReturnType<typeof vi.fn>; finished: Promise<void> };

function install({ hidden = false, reduced = false } = {}) {
  const started: FakeTransition[] = [];
  let finish!: () => void;
  const start = vi.fn((cb: () => void) => {
    const t: FakeTransition = { skipTransition: vi.fn(), finished: new Promise<void>((r) => (finish = r)) };
    started.push(t);
    queueMicrotask(cb); // like the browser: the update runs after capture
    return t;
  });
  Object.defineProperty(document, "startViewTransition", { value: start, configurable: true });
  Object.defineProperty(document, "hidden", { value: hidden, configurable: true });
  window.matchMedia = vi.fn().mockReturnValue({ matches: reduced }) as unknown as typeof window.matchMedia;
  return { start, started, finish: () => finish() };
}

afterEach(() => {
  delete (document as unknown as Record<string, unknown>).startViewTransition;
});

describe("withViewTransition", () => {
  it("animates the update when the tab is visible", async () => {
    const { start, finish } = install();
    const update = vi.fn();
    withViewTransition(update);
    expect(start).toHaveBeenCalledTimes(1);
    await Promise.resolve();
    expect(update).toHaveBeenCalledTimes(1);
    finish();
    await new Promise((r) => setTimeout(r)); // let finished.finally clear the running slot
  });

  it("applies the update at once in a hidden tab", () => {
    const { start } = install({ hidden: true });
    const update = vi.fn();
    withViewTransition(update);
    expect(start).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledTimes(1);
  });

  it("applies the update at once under reduced motion", () => {
    const { start } = install({ reduced: true });
    const update = vi.fn();
    withViewTransition(update);
    expect(start).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledTimes(1);
  });

  it("finishes a running transition instead of queueing a second one", async () => {
    const { start, started, finish } = install();
    withViewTransition(vi.fn());
    const second = vi.fn();
    withViewTransition(second);
    expect(start).toHaveBeenCalledTimes(1);
    expect(started[0].skipTransition).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
    finish();
    await new Promise((r) => setTimeout(r)); // let finished.finally clear the running slot
  });
});
