import { describe, expect, it } from "vitest";

import { resolveServerUrl } from "@/lib/live/server-url";

/**
 * The address the room dials.
 *
 * This is not a formatting detail. On 2026-08-18 this function returned
 * `wss://host/rtc`, the LiveKit SDK appended its own `/rtc`, and production
 * asked for `/rtc/rtc` — which the media server answers `404`. The room never
 * connected, in any lesson, since the feature shipped.
 *
 * Nothing caught it. The token was minted, the grants differed by role, nginx
 * proxied `/rtc` correctly, the certificate was right, the camera policy was
 * fixed, and every one of those checks passes while the room fails to connect.
 * The only thing that would have caught it is an assertion about this exact
 * string.
 */
describe("resolveServerUrl", () => {
  it("gives the SDK the origin, and lets it add its own /rtc", () => {
    // If this ever ends in "/rtc" again, production asks for "/rtc/rtc".
    expect(resolveServerUrl("", "https://grasslms.online/admin/live/abc")).toBe(
      "wss://grasslms.online",
    );
  });

  it("does not end in a path at all", () => {
    const url = resolveServerUrl("", "https://grasslms.online/lesson/xyz?a=1");

    expect(new URL(url).pathname).toBe("/");
  });

  it("keeps the port, because a development host is not on 443", () => {
    expect(resolveServerUrl("", "http://localhost:3000/lesson/xyz")).toBe("ws://localhost:3000");
  });

  it("uses ws for a plain-text origin and wss for a secure one", () => {
    expect(resolveServerUrl("", "http://localhost:3000/x")).toMatch(/^ws:\/\//);
    expect(resolveServerUrl("", "https://grasslms.online/x")).toMatch(/^wss:\/\//);
  });

  it("leaves an explicitly configured address alone", () => {
    // A deployment that names its own media host means it; nothing here should
    // second-guess it.
    expect(resolveServerUrl("wss://media.example.test", "https://grasslms.online/x")).toBe(
      "wss://media.example.test",
    );
  });
});
