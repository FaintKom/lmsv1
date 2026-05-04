"use client";

import { useMemo } from "react";
import { YouTubeEmbed } from "./youtube-embed";

/**
 * Regex that matches YouTube URLs in text content.
 *
 * Captures:
 *  - https://www.youtube.com/watch?v=VIDEO_ID
 *  - https://youtu.be/VIDEO_ID
 *  - https://www.youtube.com/embed/VIDEO_ID
 */
const YOUTUBE_URL_RE =
  /https?:\/\/(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]+)[^\s<]*/g;

/**
 * Regex that matches existing YouTube iframe embeds in HTML.
 * Captures the video ID from the src attribute.
 */
const YOUTUBE_IFRAME_RE =
  /<iframe[^>]*src=["']https?:\/\/(?:www\.)?youtube\.com\/embed\/([\w-]+)[^"']*["'][^>]*>[\s\S]*?<\/iframe>/gi;

interface Segment {
  type: "html" | "youtube";
  content: string; // raw HTML for html segments, full URL for youtube segments
}

function splitContent(html: string): Segment[] {
  // First, replace iframes with placeholder tokens to avoid double-matching
  const iframePlaceholders: Map<string, string> = new Map();
  let counter = 0;
  let processed = html.replace(YOUTUBE_IFRAME_RE, (match, videoId) => {
    const token = `__YT_IFRAME_${counter++}__`;
    iframePlaceholders.set(token, `https://www.youtube.com/watch?v=${videoId}`);
    return token;
  });

  // Now find YouTube URLs in the remaining text
  const segments: Segment[] = [];
  let lastIndex = 0;

  // Combine iframe placeholders and URL matches
  const combinedRe = new RegExp(
    `(__YT_IFRAME_\\d+__)|${YOUTUBE_URL_RE.source}`,
    "g"
  );

  let match: RegExpExecArray | null;
  while ((match = combinedRe.exec(processed)) !== null) {
    // Push preceding HTML
    if (match.index > lastIndex) {
      segments.push({
        type: "html",
        content: processed.slice(lastIndex, match.index),
      });
    }

    const placeholderToken = match[1];
    if (placeholderToken && iframePlaceholders.has(placeholderToken)) {
      segments.push({
        type: "youtube",
        content: iframePlaceholders.get(placeholderToken)!,
      });
    } else {
      // It's a URL match -- use the full matched URL
      segments.push({
        type: "youtube",
        content: match[0],
      });
    }

    lastIndex = match.index + match[0].length;
  }

  // Push remaining HTML
  if (lastIndex < processed.length) {
    segments.push({
      type: "html",
      content: processed.slice(lastIndex),
    });
  }

  return segments;
}

export interface AutoYouTubeProps {
  html: string;
}

/**
 * Takes a raw HTML string, detects YouTube URLs and iframes within it,
 * and replaces them with rich `<YouTubeEmbed>` components.
 *
 * Usage:
 * ```tsx
 * <AutoYouTube html={lessonContent} />
 * ```
 */
export function AutoYouTube({ html }: AutoYouTubeProps) {
  const segments = useMemo(() => splitContent(html), [html]);

  return (
    <>
      {segments.map((segment, i) => {
        if (segment.type === "youtube") {
          return (
            <YouTubeEmbed key={`yt-${i}`} url={segment.content} className="my-4" />
          );
        }
        return (
          <span
            key={`html-${i}`}
            dangerouslySetInnerHTML={{ __html: segment.content }}
          />
        );
      })}
    </>
  );
}

export default AutoYouTube;
