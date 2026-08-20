"use client";

/**
 * A slide deck on a lesson page — someone else's page, framed.
 *
 * Teachers paste a published Google Slides link or a PDF URL; both render
 * in an iframe. The frame is sandboxed: the deck may run its own scripts
 * and talk to its own origin, and nothing else — no top-level navigation,
 * no forms, no popups away from the lesson.
 *
 * Anything that is not http(s) is refused rather than framed, so a
 * `javascript:` URL pasted into the editor is a placeholder, not a hole.
 */

import { useTranslation } from "@/lib/i18n/context";

export function isEmbeddableUrl(url: string | undefined): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function PresentationEmbed({
  url,
  emptyLabel,
}: {
  url?: string;
  /** Overrides the default "cannot be shown" line — the editor says
   *  "paste a link above" instead, which is useless to a student. */
  emptyLabel?: string;
}) {
  const { t } = useTranslation();

  if (!isEmbeddableUrl(url)) {
    return (
      <div className="flex aspect-video w-full items-center justify-center rounded-lg border border-dashed border-border-strong bg-surface-2 text-sm text-text-subtle">
        {emptyLabel ?? t("lesson.slidesUnavailable")}
      </div>
    );
  }
  return (
    <iframe
      src={url}
      title="presentation"
      className="aspect-video w-full rounded-lg border border-border"
      allowFullScreen
      sandbox="allow-scripts allow-same-origin allow-presentation"
      referrerPolicy="no-referrer"
    />
  );
}
