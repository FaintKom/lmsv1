import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useLessonChannel } from "./use-lesson-channel";

class FakeEventSource {
  static instances: FakeEventSource[] = [];
  url: string;
  listeners: Record<string, ((e: MessageEvent) => void)[]> = {};
  onopen: (() => void) | null = null;
  onerror: (() => void) | null = null;
  closed = false;
  constructor(url: string) {
    this.url = url;
    FakeEventSource.instances.push(this);
  }
  addEventListener(type: string, cb: (e: MessageEvent) => void) {
    (this.listeners[type] ??= []).push(cb);
  }
  emit(type: string, data: unknown) {
    for (const cb of this.listeners[type] ?? []) {
      cb({ data: JSON.stringify(data) } as MessageEvent);
    }
  }
  close() {
    this.closed = true;
  }
}

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn(), setQueryData: vi.fn() }),
}));

describe("useLessonChannel", () => {
  beforeEach(() => {
    FakeEventSource.instances = [];
    vi.stubGlobal("EventSource", FakeEventSource as unknown as typeof EventSource);
  });

  it("subscribes and dispatches scene_changed", () => {
    const onScene = vi.fn();
    renderHook(() => useLessonChannel("L1", { onSceneChanged: onScene }));
    const es = FakeEventSource.instances[0];
    expect(es.url).toBe("/api/v1/live-lessons/L1/events");
    act(() => es.emit("scene_changed", { type: "board", payload: { board_id: "b1" } }));
    expect(onScene).toHaveBeenCalledWith({ type: "board", payload: { board_id: "b1" } });
  });

  it("closes on unmount and on lesson_ended", () => {
    const onEnded = vi.fn();
    const { unmount } = renderHook(() => useLessonChannel("L1", { onLessonEnded: onEnded }));
    const es = FakeEventSource.instances[0];
    act(() => es.emit("lesson_ended", {}));
    expect(onEnded).toHaveBeenCalled();
    expect(es.closed).toBe(true);
    unmount();
  });

  it("does not subscribe when lessonId is null", () => {
    renderHook(() => useLessonChannel(null, {}));
    expect(FakeEventSource.instances).toHaveLength(0);
  });
});
