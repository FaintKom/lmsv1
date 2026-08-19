/**
 * Plays back a run the server already performed.
 *
 * What this replaces is why it is small. `step-executor.ts` parsed generated
 * code into commands, walked control flow, and asked a TypeScript copy of the
 * world what each one did — three jobs, and the loop handling was wrong: it
 * spliced a `while` body up to a hundred times *before* executing any of it, so
 * the condition could never change.
 *
 * Now the server runs the program and sends back every frame. Nothing here
 * decides anything; it moves an index. Stepping and scrubbing come out better
 * than they were, because the whole run is already in hand.
 */

/** One cell that a command changed. Only what moved is sent. */
export interface CellChange {
  x: number;
  y: number;
  item?: boolean;
  painted?: boolean;
  value?: number;
}

/** The robot after one command, and what that command did. */
export interface Frame {
  i: number;
  cmd: string;
  /** False when the world refused — a wall, a bare floor, empty hands. */
  ok: boolean;
  x: number;
  y: number;
  facing: "up" | "right" | "down" | "left";
  carrying: number;
  items_left: number;
  cells: CellChange[];
  /** A refusal key — `wall`, `edge`, `no_item`. Translated for display, never shown raw. */
  msg: string | null;
}

export interface TracePlayerOptions<F = Frame> {
  /** Called with each frame as it is reached, and with null on reset. */
  onFrame?: (frame: F | null, index: number) => void;
  /** Called once the last frame has been shown, or playback stopped. */
  onEnd?: (reachedEnd: boolean) => void;
}

const MIN_DELAY_MS = 30;
const MAX_DELAY_MS = 1000;

/**
 * Generic in the frame, because the player never looks inside one — it counts
 * them, indexes them, and hands them back. 2D and 3D describe a moment
 * differently (a 3D frame carries a height, and what to animate), and one
 * player serving both is the same reasoning that parameterised the backend
 * runner.
 *
 * The type argument defaults to the 2D frame, so existing callers read as they
 * did.
 */
export class TracePlayer<F = Frame> {
  /**
   * Assignable after construction, not only through the constructor, so a React
   * caller can build the player in a lazy state initialiser and wire the
   * callbacks up in an effect. Reading a ref inside a `useMemo` factory counts
   * as reading it during render, and the lint rule is right to say so.
   */
  onFrame: TracePlayerOptions<F>["onFrame"] | null = null;
  onEnd: TracePlayerOptions<F>["onEnd"] | null = null;

  private frames: F[] = [];
  private index = -1;
  private delayMs = 300;
  private playing = false;
  private paused = false;
  /** Bumped on every load and stop, so a sleeping play loop knows it is stale. */
  private generation = 0;

  constructor(options: TracePlayerOptions<F> = {}) {
    this.onFrame = options.onFrame ?? null;
    this.onEnd = options.onEnd ?? null;
  }

  load(frames: F[]) {
    this.generation += 1;
    this.frames = frames;
    this.index = -1;
    this.playing = false;
    this.paused = false;
    this.onFrame?.(null, -1);
  }

  setSpeed(delayMs: number) {
    this.delayMs = Math.max(MIN_DELAY_MS, Math.min(MAX_DELAY_MS, delayMs));
  }

  /** Show one more frame. Returns it, or null at the end. */
  step(): F | null {
    if (this.index >= this.frames.length - 1) return null;
    this.index += 1;
    const frame = this.frames[this.index];
    this.onFrame?.(frame, this.index);
    return frame;
  }

  /**
   * Jump to a frame. Accepts -1 for "before anything happened", which is how
   * the player shows the level as the pupil found it.
   */
  seek(index: number): F | null {
    const clamped = Math.max(-1, Math.min(this.frames.length - 1, index));
    this.index = clamped;
    const frame = clamped < 0 ? null : this.frames[clamped];
    this.onFrame?.(frame, clamped);
    return frame;
  }

  /** Play from wherever the index is. Resolves when it stops or runs out. */
  async play(delayMs?: number): Promise<void> {
    if (delayMs !== undefined) this.setSpeed(delayMs);
    const mine = this.generation;
    this.playing = true;
    this.paused = false;

    while (this.playing && this.generation === mine) {
      if (this.paused) {
        await sleep(50);
        continue;
      }
      if (!this.step()) break;
      await sleep(this.delayMs);
    }

    const reachedEnd = this.generation === mine && this.atEnd;
    this.playing = false;
    if (this.generation === mine) this.onEnd?.(reachedEnd);
  }

  pause() {
    this.paused = true;
  }

  resume() {
    this.paused = false;
  }

  /** Stop playing and leave the index where it is. */
  stop() {
    this.generation += 1;
    this.playing = false;
    this.paused = false;
  }

  /** Stop, and go back to before the first frame. */
  reset() {
    this.stop();
    this.index = -1;
    this.onFrame?.(null, -1);
  }

  get currentIndex() {
    return this.index;
  }

  get current(): F | null {
    return this.index < 0 ? null : (this.frames[this.index] ?? null);
  }

  get length() {
    return this.frames.length;
  }

  get isPlaying() {
    return this.playing;
  }

  get isPaused() {
    return this.paused;
  }

  get atEnd() {
    return this.frames.length > 0 && this.index >= this.frames.length - 1;
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
