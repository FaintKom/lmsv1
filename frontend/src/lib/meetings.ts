/**
 * Jitsi Meet join-URL composition.
 *
 * Meetings run on the FREE public `meet.jit.si` instance (no JWT, no JaaS,
 * no signup gate). On free meet.jit.si the FIRST participant to enter a room
 * becomes its moderator — there is no cryptographic way to designate a host.
 *
 * So "teacher-as-host" is only an APPROXIMATION, achieved purely via URL
 * composition:
 *   - The host (meeting creator / teacher / admin) gets a no-prejoin URL so
 *     they drop straight into the empty room and become moderator first.
 *   - Students join muted (audio + video off) so they enter quietly.
 *   - Everyone carries their display name so participants are identified.
 *
 * The backend `room_url` (https://meet.jit.si/grasslms-<id>) is never changed
 * here — we only append a `#`-fragment of Jitsi config overrides.
 */

export interface JoinUrlOptions {
  /** Display name shown inside the Jitsi room for this participant. */
  displayName?: string | null;
  /** True for the meeting creator / teachers / admins (the "host"). */
  isHost: boolean;
}

/**
 * Build a role-aware Jitsi join URL from the base `room_url`.
 *
 * meet.jit.si reads config overrides from the URL hash fragment, e.g.
 * `#config.startWithAudioMuted=true&userInfo.displayName=%22Alice%22`.
 * Boolean/JS values are written verbatim; strings must be JSON-quoted
 * (hence the `%22…%22` wrapping the URL-encoded display name).
 */
export function buildJoinUrl(roomUrl: string, options: JoinUrlOptions): string {
  const { displayName, isHost } = options;
  const params: string[] = [];

  if (displayName && displayName.trim()) {
    // Jitsi expects a JSON string value, i.e. wrapped in double quotes,
    // then the whole thing URL-encoded.
    const quoted = `"${displayName.trim()}"`;
    params.push(`userInfo.displayName=${encodeURIComponent(quoted)}`);
  }

  if (isHost) {
    // Skip the prejoin screen so the host lands in the room first and
    // becomes moderator. Do NOT force-mute the host.
    params.push("config.prejoinConfig.enabled=false");
  } else {
    // Students join quietly.
    params.push("config.startWithAudioMuted=true");
    params.push("config.startWithVideoMuted=true");
  }

  if (params.length === 0) return roomUrl;
  return `${roomUrl}#${params.join("&")}`;
}
