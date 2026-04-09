"use client";

/**
 * VideoPlayer with resume + progress tracking for YouTube embeds.
 *
 * Wraps a YouTube iframe, hooks into the YouTube IFrame Player API, and:
 * - On mount: fetches saved progress for this lesson from the backend,
 *   seeks to `position_seconds` if there is one.
 * - While playing: every 5 seconds, POSTs the current position to
 *   /api/v1/progress/lessons/{lessonId}/video-progress. The backend
 *   auto-marks the lesson complete when watched_seconds >= 0.9 * duration.
 * - On unmount and on pause: saves one last time so closing the tab
 *   doesn't lose the last few seconds of watch state.
 *
 * Non-YouTube URLs (Vimeo, other iframes) fall back to a plain iframe
 * with NO progress tracking. Vimeo integration is a follow-up — it
 * needs @vimeo/player, which is a separate dep.
 */

import { useEffect, useRef, useState } from "react";

import apiClient from "@/lib/api-client";

// Global singleton that loads the YT IFrame API once
let ytApiPromise: Promise<unknown> | null = null;

function loadYouTubeApi(): Promise<unknown> {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (ytApiPromise) return ytApiPromise;

  ytApiPromise = new Promise((resolve) => {
    const w = window as unknown as Record<string, unknown>;
    // Already loaded?
    if (w.YT && (w.YT as { Player?: unknown }).Player) {
      resolve(w.YT);
      return;
    }
    // Hook the API's ready callback
    (w as { onYouTubeIframeAPIReady?: () => void }).onYouTubeIframeAPIReady = () => {
      resolve((window as unknown as { YT: unknown }).YT);
    };
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.body.appendChild(tag);
  });

  return ytApiPromise;
}

function extractYouTubeId(url: string): string | null {
  const m = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  return m ? m[1] : null;
}

interface VideoPlayerProps {
  url: string;
  lessonId: string;
}

interface YTPlayer {
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlayerState: () => number;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  destroy: () => void;
}

export function VideoPlayer({ url, lessonId }: VideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const resumePositionRef = useRef<number>(0);
  const saveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isYouTube, setIsYouTube] = useState<boolean>(false);
  const [embedUrl, setEmbedUrl] = useState<string>("");

  useEffect(() => {
    const ytId = extractYouTubeId(url);
    if (ytId) {
      setIsYouTube(true);
      // ?enablejsapi=1 is required for postMessage-based control
      setEmbedUrl(
        `https://www.youtube.com/embed/${ytId}?enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`
      );
    } else {
      setIsYouTube(false);
      // Vimeo fallback
      const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
      if (vimeoMatch) {
        setEmbedUrl(`https://player.vimeo.com/video/${vimeoMatch[1]}`);
      } else {
        setEmbedUrl(url);
      }
    }
  }, [url]);

  // Fetch existing progress once, so we know where to resume
  useEffect(() => {
    let cancelled = false;
    apiClient
      .get(`/progress/lessons/${lessonId}/video-progress`)
      .then(({ data }) => {
        if (!cancelled && data && typeof data.position_seconds === "number") {
          resumePositionRef.current = data.position_seconds;
        }
      })
      .catch(() => {
        // No existing progress — that's fine
      });
    return () => {
      cancelled = true;
    };
  }, [lessonId]);

  // Mount the YouTube player when we know the URL is YouTube
  useEffect(() => {
    if (!isYouTube || !embedUrl || !containerRef.current) return;

    let disposed = false;
    const containerId = `yt-player-${lessonId}`;
    // Next.js strict mode may double-invoke effects; make sure the div has a
    // stable id so we don't create duplicate players.
    containerRef.current.id = containerId;

    loadYouTubeApi().then((YT) => {
      if (disposed || !YT || !containerRef.current) return;
      const y = YT as {
        Player: new (
          el: string,
          cfg: {
            events: {
              onReady: (e: { target: YTPlayer }) => void;
              onStateChange: (e: { data: number; target: YTPlayer }) => void;
            };
            videoId?: string;
            playerVars?: Record<string, unknown>;
          }
        ) => YTPlayer;
        PlayerState: { PLAYING: number; PAUSED: number; ENDED: number };
      };

      const videoId = extractYouTubeId(url) || "";

      playerRef.current = new y.Player(containerId, {
        videoId,
        playerVars: {
          enablejsapi: 1,
          origin: window.location.origin,
          rel: 0,
          modestbranding: 1,
        },
        events: {
          onReady: (e) => {
            if (resumePositionRef.current > 1) {
              try {
                e.target.seekTo(resumePositionRef.current, true);
              } catch {
                /* ignore seek failures */
              }
            }
          },
          onStateChange: (e) => {
            const PLAYING = y.PlayerState.PLAYING;
            const PAUSED = y.PlayerState.PAUSED;
            const ENDED = y.PlayerState.ENDED;

            if (e.data === PLAYING) {
              // Start periodic saves
              if (saveIntervalRef.current) clearInterval(saveIntervalRef.current);
              saveIntervalRef.current = setInterval(() => {
                saveProgress();
              }, 5000);
            } else {
              if (saveIntervalRef.current) {
                clearInterval(saveIntervalRef.current);
                saveIntervalRef.current = null;
              }
              if (e.data === PAUSED || e.data === ENDED) {
                saveProgress();
              }
            }
          },
        },
      });
    });

    return () => {
      disposed = true;
      if (saveIntervalRef.current) {
        clearInterval(saveIntervalRef.current);
        saveIntervalRef.current = null;
      }
      // Save one last time on unmount
      saveProgress();
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch {
          /* ignore */
        }
        playerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isYouTube, embedUrl, lessonId, url]);

  function saveProgress() {
    const p = playerRef.current;
    if (!p) return;
    try {
      const position = p.getCurrentTime();
      const duration = p.getDuration();
      if (position > 0) {
        apiClient
          .put(`/progress/lessons/${lessonId}/video-progress`, {
            position_seconds: position,
            duration_seconds: duration || null,
          })
          .catch(() => {
            /* swallow network errors; next tick will retry */
          });
      }
    } catch {
      /* ignore — player may not be ready */
    }
  }

  if (!embedUrl) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-xl bg-black text-white">
        Preparing video...
      </div>
    );
  }

  if (!isYouTube) {
    // Non-YouTube — fall back to a plain iframe with no progress tracking.
    return (
      <div className="aspect-video overflow-hidden rounded-xl bg-black">
        <iframe
          src={embedUrl}
          className="h-full w-full"
          allowFullScreen
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        />
      </div>
    );
  }

  return (
    <div className="aspect-video overflow-hidden rounded-xl bg-black">
      {/* The YT Player API replaces this div with an iframe at runtime */}
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}
