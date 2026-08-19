import { Track, type LocalParticipant } from "livekit-client";

/**
 * Recording a lesson, from the teacher's own tracks and nobody else's.
 *
 * FR-027, and the reason is not only that compositing every participant in the
 * teacher's browser is expensive: a recording that holds no child is one a
 * European school can switch on without its data protection officer having to
 * rule on filming pupils.
 *
 * Enforced by construction rather than by intent — this reads the *local*
 * participant's publications and never touches a remote track. There is a unit
 * test asserting exactly that, because "we meant to" is not a control.
 */

/** Milliseconds between chunks. Small enough that a crash loses little. */
const CHUNK_MS = 5000;

/**
 * Bitrates, chosen so a long lesson still fits the server's upload limit.
 *
 * At roughly 350 kbit/s a 45-minute lesson lands near 120 MB and a 90-minute
 * one near 240 MB, both inside the 300 MB the server accepts. Left to itself
 * the browser picks a rate for a video call, not for a file somebody has to
 * upload over a school's connection.
 *
 * Screen content — slides, a code editor — is mostly static, and VP8 spends
 * almost nothing on frames that do not change, so this is not the visible
 * economy it looks like.
 */
const VIDEO_BITS_PER_SECOND = 300_000;
const AUDIO_BITS_PER_SECOND = 48_000;

export interface LessonRecording {
  file: Blob;
  /** Whole seconds of wall clock between start and stop. */
  seconds: number;
}

export interface LessonRecorder {
  stop: () => Promise<LessonRecording>;
}

/**
 * Build the stream to record.
 *
 * `MediaRecorder` writes a single video track, and what belongs in it is what
 * the teacher is SHOWING, not who is showing it (FR-039). The first real
 * playback proved the point: a lesson taught on the board came back as
 * fifty minutes of the teacher's face.
 *
 * Priority: the shared screen; else a capture of the teacher's own lesson
 * tab, which carries the board, the material and the task as shown; else the
 * camera, so a recording still exists on a browser that refuses tab capture.
 * The microphone rides along in every case, and no remote participant's
 * track is ever touched — that boundary has its own test.
 */
export function localRecordingStream(local: LocalParticipant): MediaStream {
  const tracks: MediaStreamTrack[] = [];

  const screen = local.getTrackPublication(Track.Source.ScreenShare)?.track?.mediaStreamTrack;
  const camera = local.getTrackPublication(Track.Source.Camera)?.track?.mediaStreamTrack;
  const video = screen ?? camera;
  if (video) tracks.push(video);

  const mic = local.getTrackPublication(Track.Source.Microphone)?.track?.mediaStreamTrack;
  if (mic) tracks.push(mic);

  return new MediaStream(tracks);
}

/**
 * The teacher's own lesson tab as a video track, or null where the browser
 * refuses. Asked for only when nothing better is being shared: with a screen
 * share running, the screen itself is already the thing being shown.
 */
async function captureOwnTab(): Promise<MediaStreamTrack | null> {
  try {
    const gdm = navigator.mediaDevices?.getDisplayMedia;
    if (!gdm) return null;
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: { displaySurface: "browser" },
      audio: false,
      // Chrome-only hints; other browsers ignore them and show their picker.
      preferCurrentTab: true,
      selfBrowserSurface: "include",
    } as MediaStreamConstraints);
    return stream.getVideoTracks()[0] ?? null;
  } catch {
    return null;
  }
}

/**
 * Start recording.
 *
 * Returns a handle whose `stop` resolves with the finished file, so the caller
 * uploads what it is handed rather than reaching into recorder internals.
 */
export async function startLessonRecording(local: LocalParticipant): Promise<LessonRecorder> {
  const stream = localRecordingStream(local);
  if (stream.getTracks().length === 0) {
    throw new Error("nothing to record: no local camera, screen or microphone");
  }

  // No screen share running: the camera is currently the video, and the tab —
  // the board, the material, the task, as shown — is the better witness.
  const sharingScreen = !!local.getTrackPublication(Track.Source.ScreenShare)?.track;
  let tabTrack: MediaStreamTrack | null = null;
  if (!sharingScreen) {
    tabTrack = await captureOwnTab();
    if (tabTrack) {
      for (const v of stream.getVideoTracks()) stream.removeTrack(v);
      stream.addTrack(tabTrack);
    }
  }

  const chunks: Blob[] = [];
  // Wall clock, because it is what a person means by "how long is it". The
  // container's own duration is not written until the file is finalised, and
  // reading it back would mean parsing the WebM we just made.
  const startedAt = Date.now();
  const recorder = new MediaRecorder(stream, {
    mimeType: "video/webm",
    videoBitsPerSecond: VIDEO_BITS_PER_SECOND,
    audioBitsPerSecond: AUDIO_BITS_PER_SECOND,
  });
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };
  recorder.start(CHUNK_MS);

  return {
    stop: () =>
      new Promise<LessonRecording>((resolve) => {
        recorder.onstop = () => {
          // The tab capture is ours alone — release it, or the browser keeps
          // announcing "this tab is being shared" after the recording ended.
          tabTrack?.stop();
          resolve({
            file: new Blob(chunks, { type: "video/webm" }),
            seconds: Math.max(1, Math.round((Date.now() - startedAt) / 1000)),
          });
        };
        recorder.stop();
      }),
  };
}

/** Send the finished file. Where it lands is the server's decision. */
export async function uploadRecording(
  recordingId: string,
  recording: LessonRecording,
): Promise<void> {
  const { file, seconds } = recording;
  const res = await fetch(`/api/v1/recordings/${recordingId}/upload`, {
    method: "PUT",
    body: file,
    credentials: "include",
    headers: { "Content-Type": "video/webm" },
  });
  if (!res.ok) throw new Error(`upload failed: ${res.status}`);

  await fetch(`/api/v1/recordings/${recordingId}/complete`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    // The length goes with it. Without this the row is `ready` and says
    // nothing about how long it is, which is the first thing anybody asks of a
    // recording before deciding to watch it.
    body: JSON.stringify({ size_bytes: file.size, duration_seconds: seconds }),
  });
}
