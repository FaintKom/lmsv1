import { describe, expect, it } from "vitest";

import { buildJoinUrl } from "./meetings";

const ROOM = "https://meet.jit.si/grasslms-abc123def456";

describe("buildJoinUrl", () => {
  it("drops the host straight into the room (no prejoin, no force-mute)", () => {
    const url = buildJoinUrl(ROOM, { displayName: "Jane Teacher", isHost: true });

    expect(url.startsWith(`${ROOM}#`)).toBe(true);
    expect(url).toContain("config.prejoinConfig.enabled=false");
    // Host must NOT be force-muted.
    expect(url).not.toContain("startWithAudioMuted");
    expect(url).not.toContain("startWithVideoMuted");
  });

  it("joins students quietly (audio + video muted) and never enables prejoin", () => {
    const url = buildJoinUrl(ROOM, { displayName: "Bob Student", isHost: false });

    expect(url).toContain("config.startWithAudioMuted=true");
    expect(url).toContain("config.startWithVideoMuted=true");
    expect(url).not.toContain("prejoinConfig");
  });

  it("encodes the display name as a JSON-quoted, URL-encoded value", () => {
    const url = buildJoinUrl(ROOM, { displayName: "Anna Müller", isHost: false });

    // JSON-quoted -> "Anna Müller" -> URL-encoded.
    const expected = `userInfo.displayName=${encodeURIComponent('"Anna Müller"')}`;
    expect(url).toContain(expected);
    // Sanity: the %22 quote wrappers survive encoding.
    expect(url).toContain("%22");
  });

  it("omits the displayName param when no name is provided", () => {
    const noName = buildJoinUrl(ROOM, { displayName: null, isHost: true });
    expect(noName).not.toContain("userInfo.displayName");

    const blank = buildJoinUrl(ROOM, { displayName: "   ", isHost: false });
    expect(blank).not.toContain("userInfo.displayName");
  });

  it("composes multiple params after a single # with & separators", () => {
    const url = buildJoinUrl(ROOM, { displayName: "Jane", isHost: false });
    // Exactly one fragment separator.
    expect(url.split("#")).toHaveLength(2);
    const fragment = url.split("#")[1];
    expect(fragment.split("&").length).toBeGreaterThanOrEqual(2);
  });
});
