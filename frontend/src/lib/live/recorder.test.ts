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
