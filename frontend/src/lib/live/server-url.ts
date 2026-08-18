/**
 * Where the browser connects when the server did not name a host.
 *
 * An empty `url` means same origin: nginx proxies /rtc to the media server, so
 * the media rides the certificate and the port the platform already has, and
 * there is no second hostname for anybody to configure or get wrong.
 */
export function resolveServerUrl(url: string, origin: string): string {
  if (url) return url;
  const scheme = origin.startsWith("https:") ? "wss" : "ws";
  // The origin, and deliberately not `${origin}/rtc`. The SDK appends `/rtc`
  // itself, so naming it here asked production for `/rtc/rtc` — a path the
  // media server does not serve, answered `404`, and retried forever behind a
  // tile that looked like a camera nobody had switched on.
  //
  // Every check this feature passed — the token, the grants, the proxy, the
  // certificate — passes with the room never connecting. There is a test
  // beside this file now, because the next person to touch it will have the
  // same instinct.
  return `${scheme}://${new URL(origin).host}`;
}
