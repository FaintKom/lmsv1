import { act, cleanup, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * The call provider's two decisions, and the one failure a page can see.
 *
 * Both decisions have been wrong in production once each, with nothing red
 * anywhere: level-triggered re-join flapped the teacher's scene, and a
 * released slot took the interface with it, leaving the floating panel an
 * empty rectangle (T104). These tests are the deferred T035, revived the day
 * media-stage grew logic of its own — which was the stated condition.
 */

vi.mock("@livekit/components-react", () => ({
  // The room is the SDK's business. Here it is a box, so the provider's own
  // choices are the only thing under test.
  LiveKitRoom: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  RoomAudioRenderer: () => null,
}));

const fetchMediaToken = vi.fn();
vi.mock("@/lib/api/live", () => ({
  fetchMediaToken: (...a: unknown[]) => fetchMediaToken(...a),
  fetchBreakoutToken: vi.fn(),
}));

import { CallProvider, keepUi, sameCall, useCall } from "./call-provider";

afterEach(() => {
  cleanup();
  fetchMediaToken.mockReset();
});

describe("sameCall", () => {
  it("treats asking for the room already held as a no-op", () => {
    expect(
      sameCall({ lessonId: "L", breakoutIndex: null }, { lessonId: "L", breakoutIndex: null }),
    ).toBe(true);
  });

  it("re-joins when a split moves somebody between rooms", () => {
    expect(
      sameCall({ lessonId: "L", breakoutIndex: null }, { lessonId: "L", breakoutIndex: 2 }),
    ).toBe(false);
  });

  it("re-joins across lessons", () => {
    expect(
      sameCall({ lessonId: "L", breakoutIndex: null }, { lessonId: "M", breakoutIndex: null }),
    ).toBe(false);
  });
});

describe("keepUi", () => {
  const ui = { render: () => null };

  it("gains an interface when a page offers one", () => {
    expect(keepUi(null, ui)).toBe(ui);
  });

  it("keeps the interface when a page gives back its place", () => {
    // The T104 regression in one line: returning `next` here is what made the
    // floating panel an empty rectangle in production.
    expect(keepUi(ui, null)).toBe(ui);
  });
});

function Harness() {
  const call = useCall();
  return (
    <div>
      <button onClick={() => call.join("lesson-1", null)}>join</button>
      <button onClick={() => call.setSlot(null, { render: () => <span>the call</span> })}>
        claim
      </button>
      <button onClick={() => call.setSlot(null, null)}>release</button>
      <span data-testid="lesson">{call.lessonId ?? "none"}</span>
    </div>
  );
}

describe("CallProvider", () => {
  const grant = {
    url: "",
    token: "t",
    identity: "i",
    room: "r",
    can_publish_screen: false,
    can_record: false,
    expires_in: 120,
  };

  it("keeps drawing the call after the page releases its slot", async () => {
    fetchMediaToken.mockResolvedValue(grant);

    render(
      <QueryClientProvider client={new QueryClient()}>
        <CallProvider>
          <Harness />
        </CallProvider>
      </QueryClientProvider>,
    );

    await act(async () => {
      screen.getByText("join").click();
    });
    expect(screen.getByTestId("lesson").textContent).toBe("lesson-1");

    await act(async () => {
      screen.getByText("claim").click();
    });
    expect(screen.getByText("the call")).toBeTruthy();

    // The page goes away. The person is still in the call, and must still see
    // it — as the floating panel, not as nothing (T104).
    await act(async () => {
      screen.getByText("release").click();
    });
    expect(screen.getByText("the call")).toBeTruthy();
  });

  it("does not reconnect when asked for the room it already holds", async () => {
    fetchMediaToken.mockResolvedValue(grant);

    render(
      <QueryClientProvider client={new QueryClient()}>
        <CallProvider>
          <Harness />
        </CallProvider>
      </QueryClientProvider>,
    );

    await act(async () => {
      screen.getByText("join").click();
    });
    await act(async () => {
      screen.getByText("join").click();
    });

    // One grant fetched, not two: the second ask was for the same room.
    expect(fetchMediaToken).toHaveBeenCalledTimes(1);
  });
});
