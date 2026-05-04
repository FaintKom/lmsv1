"use client";

import { useCallback, useEffect, useState } from "react";

interface VideoMetadata {
 id: string;
 title: string | null;
 thumbnail: string;
 channel: string | null;
 duration: string | null;
 publishedAt: string | null;
}

export interface YouTubeEmbedProps {
 url: string;
 className?: string;
}

/**
 * Extract a YouTube video ID from various URL formats or a bare ID.
 *
 * Handles:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - bare VIDEO_ID (11-char alphanumeric string)
 */
function extractVideoId(url: string): string | null {
 const trimmed = url.trim();

 // youtube.com/watch?v=ID
 try {
 const parsed = new URL(trimmed);
 if (
 parsed.hostname.includes("youtube.com") &&
 parsed.searchParams.has("v")
 ) {
 return parsed.searchParams.get("v");
 }
 // youtu.be/ID
 if (parsed.hostname === "youtu.be") {
 return parsed.pathname.slice(1).split(/[?&#]/)[0] || null;
 }
 // youtube.com/embed/ID
 if (
 parsed.hostname.includes("youtube.com") &&
 parsed.pathname.startsWith("/embed/")
 ) {
 return parsed.pathname.split("/embed/")[1]?.split(/[?&#]/)[0] || null;
 }
 } catch {
 // Not a valid URL, try bare ID
 }

 // Bare video ID (typically 11 chars, alphanumeric + _ + -)
 if (/^[\w-]{10,12}$/.test(trimmed)) {
 return trimmed;
 }

 return null;
}

export function YouTubeEmbed({ url, className }: YouTubeEmbedProps) {
 const videoId = extractVideoId(url);
 const [metadata, setMetadata] = useState<VideoMetadata | null>(null);
 const [playing, setPlaying] = useState(false);
 const [fetchFailed, setFetchFailed] = useState(false);

 useEffect(() => {
 if (!videoId) return;

 let cancelled = false;

 async function fetchMetadata() {
 try {
 const res = await fetch(
 `/api/v1/integrations/youtube/video/${videoId}`
 );
 if (!res.ok) throw new Error("fetch failed");
 const data: VideoMetadata = await res.json();
 if (!cancelled) setMetadata(data);
 } catch {
 if (!cancelled) setFetchFailed(true);
 }
 }

 fetchMetadata();
 return () => {
 cancelled = true;
 };
 }, [videoId]);

 const handlePlay = useCallback(() => {
 setPlaying(true);
 }, []);

 if (!videoId) {
 return null;
 }

 // Fallback: if metadata fetch failed, show plain iframe immediately
 if (fetchFailed || playing) {
 return (
 <div
 className={`relative w-full overflow-hidden rounded-lg ${className ?? ""}`}
 style={{ aspectRatio: "16 / 9" }}
 >
 <iframe
 src={`https://www.youtube.com/embed/${videoId}?autoplay=${playing ? 1 : 0}&rel=0`}
 title="YouTube video player"
 allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
 allowFullScreen
 className="absolute inset-0 h-full w-full border-0"
 />
 </div>
 );
 }

 // Loading state
 if (!metadata) {
 return (
 <div
 className={`relative w-full animate-pulse overflow-hidden rounded-lg bg-ink-200 ${className ?? ""}`}
 style={{ aspectRatio: "16 / 9" }}
 />
 );
 }

 // Facade: thumbnail + play button overlay
 return (
 <div
 className={`group relative w-full cursor-pointer overflow-hidden rounded-lg ${className ?? ""}`}
 style={{ aspectRatio: "16 / 9" }}
 onClick={handlePlay}
 role="button"
 tabIndex={0}
 onKeyDown={(e) => {
 if (e.key === "Enter" || e.key === " ") {
 e.preventDefault();
 handlePlay();
 }
 }}
 aria-label={`Play video: ${metadata.title ?? "YouTube video"}`}
 >
 {/* Thumbnail */}
 <img
 src={metadata.thumbnail}
 alt={metadata.title ?? "YouTube video thumbnail"}
 className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
 loading="lazy"
 />

 {/* Dark overlay */}
 <div className="absolute inset-0 bg-ink-900/20 transition-colors group-hover:bg-ink-900/30" />

 {/* Play button */}
 <div className="absolute inset-0 flex items-center justify-center">
 <div className="flex h-16 w-16 items-center justify-center rounded-pill bg-danger shadow-lg transition-transform group-hover:scale-110 sm:h-20 sm:w-20">
 <svg
 viewBox="0 0 24 24"
 fill="white"
 className="ml-1 h-8 w-8 sm:h-10 sm:w-10"
 >
 <path d="M8 5v14l11-7z" />
 </svg>
 </div>
 </div>

 {/* Bottom info bar */}
 <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 sm:p-4">
 {metadata.title && (
 <p className="truncate text-sm font-semibold text-white sm:text-base">
 {metadata.title}
 </p>
 )}
 <div className="mt-1 flex items-center gap-2">
 {metadata.channel && (
 <span className="truncate text-xs text-ink-300 sm:text-sm">
 {metadata.channel}
 </span>
 )}
 </div>
 </div>

 {/* Duration badge */}
 {metadata.duration && (
 <div className="absolute bottom-3 right-3 rounded bg-ink-900/80 px-1.5 py-0.5 text-xs font-medium text-white sm:bottom-4 sm:right-4">
 {metadata.duration}
 </div>
 )}
 </div>
 );
}

export default YouTubeEmbed;
