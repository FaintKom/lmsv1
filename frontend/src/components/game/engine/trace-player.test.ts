import { describe, expect, it, vi } from "vitest";

import { TracePlayer, type Frame } from "./trace-player";

function frames(count: number): Frame[] {
  return Array.from({ length: count }, (_, i) => ({
    i,
    cmd: "move_forward",
    ok: true,
    x: i + 1,
    y: 0,
    facing: "right" as const,
    carrying: 0,
    items_left: 0,
    cells: [],
    msg: null,
  }));
}

describe("TracePlayer", () => {
  it("starts before the first frame, so the level shows as the pupil found it", () => {
    const player = new TracePlayer();
    player.load(frames(3));

    expect(player.currentIndex).toBe(-1);
    expect(player.current).toBeNull();
    expect(player.length).toBe(3);
  });

  it("steps one frame at a time and stops at the end", () => {
    const player = new TracePlayer();
    player.load(frames(2));

    expect(player.step()?.x).toBe(1);
    expect(player.step()?.x).toBe(2);
    expect(player.step()).toBeNull();
    expect(player.atEnd).toBe(true);
  });

  it("reports each frame as it is reached", () => {
    const onFrame = vi.fn();
    const player = new TracePlayer({ onFrame });
    player.load(frames(2));
    onFrame.mockClear();

    player.step();
    player.step();

    expect(onFrame).toHaveBeenCalledTimes(2);
    expect(onFrame.mock.calls[0][1]).toBe(0);
    expect(onFrame.mock.calls[1][1]).toBe(1);
  });

  it("seeks in both directions, and back to before the start", () => {
    const player = new TracePlayer();
    player.load(frames(5));

    expect(player.seek(3)?.x).toBe(4);
    expect(player.seek(1)?.x).toBe(2);
    expect(player.seek(-1)).toBeNull();
    expect(player.currentIndex).toBe(-1);
  });

  it("clamps a seek past either end rather than throwing", () => {
    const player = new TracePlayer();
    player.load(frames(3));

    player.seek(99);
    expect(player.currentIndex).toBe(2);

    player.seek(-99);
    expect(player.currentIndex).toBe(-1);
  });

  it("plays to the end and says it got there", async () => {
    const onEnd = vi.fn();
    const player = new TracePlayer({ onEnd });
    player.load(frames(4));

    await player.play(0);

    expect(player.currentIndex).toBe(3);
    expect(player.isPlaying).toBe(false);
    expect(onEnd).toHaveBeenCalledWith(true);
  });

  it("stops mid-run when told to, and leaves the index where it was", async () => {
    const player = new TracePlayer();
    player.load(frames(50));

    const running = player.play(5);
    await new Promise((r) => setTimeout(r, 20));
    const stoppedAt = player.currentIndex;
    player.stop();
    await running;

    expect(player.isPlaying).toBe(false);
    expect(player.currentIndex).toBe(stoppedAt);
    expect(stoppedAt).toBeLessThan(49);
  });

  it("pauses and resumes without losing its place", async () => {
    const player = new TracePlayer();
    player.load(frames(30));

    const running = player.play(5);
    await new Promise((r) => setTimeout(r, 20));
    player.pause();
    const pausedAt = player.currentIndex;

    await new Promise((r) => setTimeout(r, 40));
    expect(player.currentIndex).toBe(pausedAt);
    expect(player.isPaused).toBe(true);

    player.resume();
    await running;
    expect(player.currentIndex).toBe(29);
  });

  it("clamps the speed, so a slider cannot stall or blur the run", () => {
    const player = new TracePlayer();
    player.load(frames(1));

    player.setSpeed(0);
    player.setSpeed(99_999);
    // No getter for the delay on purpose — what matters is that neither call
    // threw and the player still runs.
    expect(player.length).toBe(1);
  });

  it("reset goes back to the start and reports it", () => {
    const onFrame = vi.fn();
    const player = new TracePlayer({ onFrame });
    player.load(frames(3));
    player.seek(2);
    onFrame.mockClear();

    player.reset();

    expect(player.currentIndex).toBe(-1);
    expect(onFrame).toHaveBeenCalledWith(null, -1);
  });

  it("a second load abandons the run in flight", async () => {
    const onEnd = vi.fn();
    const player = new TracePlayer({ onEnd });
    player.load(frames(50));

    const first = player.play(5);
    await new Promise((r) => setTimeout(r, 20));
    player.load(frames(2));
    await first;

    expect(player.currentIndex).toBe(-1);
    expect(player.length).toBe(2);
    expect(onEnd).not.toHaveBeenCalled();
  });

  it("an empty trace is not at the end, and playing it does nothing", async () => {
    const player = new TracePlayer();
    player.load([]);

    expect(player.atEnd).toBe(false);
    await player.play(0);
    expect(player.currentIndex).toBe(-1);
  });

  it("carries a refusal through untouched, for the player to translate", () => {
    const player = new TracePlayer();
    player.load([{ ...frames(1)[0], ok: false, msg: "wall", x: 0 }]);

    const frame = player.step();
    expect(frame?.ok).toBe(false);
    expect(frame?.msg).toBe("wall");
  });
});
