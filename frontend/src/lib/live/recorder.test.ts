import { describe, expect, it, vi } from "vitest";

import { localRecordingStream } from "./recorder";

/**
 * The thing worth asserting here is a boundary, not a behaviour: a lesson
 * recording holds the teacher and nothing else (FR-027).
 *
 * It is easy to widen by accident. A later "improvement" that composited every
 * tile would be a small, well-meant change with a large consequence, and the
 * only reviewer certain to notice is this file.
 */

class FakeTrack {
  constructor(public readonly id: string) {}
}

function participant(sources: Record<string, string>) {
  const reads: string[] = [];
  return {
    reads,
    getTrackPublication(source: string) {
      const id = sources[source];
      return id ? { track: { mediaStreamTrack: new FakeTrack(id) } } : undefined;
    },
    // The real object exposes the rest of the room here. Touching it is the
    // mistake this test exists to catch.
    get remoteParticipants() {
      reads.push("remoteParticipants");
      return new Map();
    },
  };
}

vi.stubGlobal(
  "MediaStream",
  class {
    tracks: unknown[];
    constructor(tracks: unknown[] = []) {
      this.tracks = tracks;
    }
    getTracks() {
      return this.tracks;
    }
  },
);

describe("localRecordingStream", () => {
  it("records the camera and the microphone", () => {
    const local = participant({ camera: "cam", microphone: "mic" });

    const stream = localRecordingStream(local as never);

    expect(stream.getTracks().map((t) => (t as FakeTrack).id)).toEqual(["cam", "mic"]);
  });

  it("prefers a shared screen over the camera, because that is what the class is watching", () => {
    const local = participant({ camera: "cam", screen_share: "screen", microphone: "mic" });

    const stream = localRecordingStream(local as never);

    const ids = stream.getTracks().map((t) => (t as FakeTrack).id);
    expect(ids).toContain("screen");
    expect(ids).not.toContain("cam");
  });

  it("never reaches for anybody else's track", () => {
    const local = participant({ camera: "cam", microphone: "mic" });

    localRecordingStream(local as never);

    // If this ever fails, a recording has started including pupils, and a
    // school's consent position changed without anybody deciding to change it.
    expect(local.reads).toEqual([]);
  });

  it("produces an empty stream rather than guessing when there is nothing local", () => {
    const local = participant({});

    expect(localRecordingStream(local as never).getTracks()).toEqual([]);
  });
});

/**
 * How long it is.
 *
 * The row said `ready` and nothing else: `duration_seconds` stayed null on
 * every recording made in production, because the browser knew the length and
 * never mentioned it (T106). It is the first thing anybody asks of a recording
 * before deciding to watch it, and it fails silently — nothing errors, a
 * column is simply empty forever.
 */
describe("startLessonRecording", () => {
  class FakeRecorder {
    onstop: (() => void) | null = null;
    ondataavailable: ((e: { data: Blob }) => void) | null = null;
    constructor(
      public stream: unknown,
      public opts: unknown,
    ) {}
    start() {}
    stop() {
      this.onstop?.();
    }
  }

  it("reports the seconds it ran for", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("MediaRecorder", FakeRecorder);
    vi.stubGlobal(
      "Blob",
      class {
        constructor(
          public parts: unknown[],
          public opts: unknown,
        ) {}
        size = 0;
      },
    );

    const { startLessonRecording } = await import("./recorder");
    const local = participant({ camera: "cam", microphone: "mic" });

    const handle = await startLessonRecording(local as never);
    vi.advanceTimersByTime(42_000);
    const result = await handle.stop();

    expect(result.seconds).toBe(42);
    vi.useRealTimers();
  });

  it("never reports zero, because a recording that exists lasted some time", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("MediaRecorder", FakeRecorder);

    const { startLessonRecording } = await import("./recorder");
    const handle = await startLessonRecording(participant({ camera: "cam" }) as never);
    const result = await handle.stop();

    expect(result.seconds).toBeGreaterThanOrEqual(1);
    vi.useRealTimers();
  });
});
