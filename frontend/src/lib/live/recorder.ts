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
 * `MediaRecorder` writes a single video track, so a screen being shared is what
 * gets recorded: the class is looking at the screen, and of the two the
 * teacher's face is the less useful. Falls back to the camera.
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
 * Start recording.
 *
 * Returns a handle whose `stop` resolves with the finished file, so the caller
 * uploads what it is handed rather than reaching into recorder internals.
 */
export function startLessonRecording(local: LocalParticipant): LessonRecorder {
  const stream = localRecordingStream(local);
  if (stream.getTracks().length === 0) {
    throw new Error("nothing to record: no local camera, screen or microphone");
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
        recorder.onstop = () =>
          resolve({
            file: new Blob(chunks, { type: "video/webm" }),
            seconds: Math.max(1, Math.round((Date.now() - startedAt) / 1000)),
          });
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
