"use client";

/**
 * TheoryViewer — renders a non-exercise "theory" lesson block: a slide deck
 * embedded from PDF / PPTX / Google Slides. No hearts, no streak, no grading —
 * theory is informational. The deck itself (browser PDF viewer, Office Online,
 * Google Slides) owns slide paging inside the iframe; we provide the LMS chrome
 * (badge, title, speaker notes, fullscreen, open-external, continue).
 *
 * See SPEC §6 and design_files/q-theory.jsx.
 */

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  Maximize2,
  ExternalLink,
  StickyNote,
  Presentation,
  X,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n/context";
import {
  buildEmbedSrc,
  THEORY_SOURCE_LABEL,
  type TheoryContent,
  type TheorySourceKind,
} from "@/lib/theory";

const BADGE_CLASS: Record<TheorySourceKind, string> = {
  pdf: "bg-danger-soft text-danger-fg",
  pptx: "bg-sun-50 text-warning-fg",
  gslides: "bg-success-soft text-primary",
};

function SourceBadge({ kind }: { kind: TheorySourceKind }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded px-2 py-0.5 font-mono text-[10px] font-extrabold tracking-wider ${BADGE_CLASS[kind]}`}
    >
      {THEORY_SOURCE_LABEL[kind]}
    </span>
  );
}

export function TheoryViewer({
  content,
  onContinue,
}: {
  content: TheoryContent;
  onContinue?: () => void;
}) {
  const { t } = useTranslation();
  const [origin, setOrigin] = useState("");
  const [showNotes, setShowNotes] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const source = content.source;
  if (!source?.url) {
    return (
      <div className="rounded-[14px] border border-border bg-ink-50 p-6 text-center text-sm text-text-muted">
        {t("theory.noSource")}
      </div>
    );
  }

  const src = buildEmbedSrc(source, origin);
  const notes = content.speaker_notes ?? [];

  return (
    <div className="rounded-[16px] border border-border bg-paper-2 p-5">
      {/* header */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-info-soft px-2.5 py-1 font-mono text-[10px] font-extrabold tracking-wider text-info-fg">
          <Presentation className="h-3 w-3" />
          {t("theory.badge")}
        </span>
        <SourceBadge kind={source.kind} />
        {source.filename && (
          <span className="font-mono text-[11px] text-text-subtle">· {source.filename}</span>
        )}
      </div>

      {content.title && (
        <h2 className="text-lg font-extrabold text-text">{content.title}</h2>
      )}
      {content.subtitle && (
        <div className="mb-3 text-[13px] text-text-muted">{content.subtitle}</div>
      )}

      {/* stage */}
      <div className="relative mt-1 overflow-hidden rounded-[14px] border border-border bg-ink-900">
        <iframe
          src={src}
          title={content.title || t("theory.badge")}
          className="aspect-video w-full"
          allowFullScreen
          loading="lazy"
        />
      </div>

      {/* notes */}
      {showNotes && notes.length > 0 && (
        <div className="mt-3 rounded-[12px] border-2 border-warning bg-sun-50 p-3 text-[13px] leading-relaxed text-text">
          <div className="mb-1.5 inline-flex items-center gap-1.5 font-mono text-[10px] font-extrabold uppercase tracking-wider text-warning-fg">
            <StickyNote className="h-3 w-3" />
            {t("theory.speakerNotes")}
          </div>
          {notes.map((n, i) => (
            <p key={i} className="mt-1">
              {n}
            </p>
          ))}
        </div>
      )}

      {/* controls */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {notes.length > 0 && (
          <button
            onClick={() => setShowNotes((s) => !s)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-ink-50 px-3 py-2 text-xs font-bold text-text-muted hover:bg-ink-100"
          >
            <StickyNote className="h-3.5 w-3.5" />
            {showNotes ? t("theory.hideNotes") : t("theory.notes")}
          </button>
        )}
        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-xl bg-ink-50 px-3 py-2 text-xs font-bold text-text-muted hover:bg-ink-100"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          {t("theory.openExternal")}
        </a>
        <button
          onClick={() => setFullscreen(true)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-ink-50 px-3 py-2 text-xs font-bold text-text-muted hover:bg-ink-100"
        >
          <Maximize2 className="h-3.5 w-3.5" />
          {t("theory.fullscreen")}
        </button>
        {onContinue && (
          <button
            onClick={onContinue}
            className="ml-auto rounded-xl bg-primary px-7 py-2.5 text-sm font-bold text-white hover:opacity-90"
          >
            {t("common.continue")}
          </button>
        )}
      </div>

      {fullscreen && (
        <TheoryFullscreen
          src={src}
          title={content.title}
          subtitle={content.subtitle}
          kind={source.kind}
          notes={notes}
          onClose={() => setFullscreen(false)}
        />
      )}
    </div>
  );
}

function TheoryFullscreen({
  src,
  title,
  subtitle,
  kind,
  notes,
  onClose,
}: {
  src: string;
  title?: string;
  subtitle?: string;
  kind: TheorySourceKind;
  notes: string[];
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [showNotes, setShowNotes] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-[100] flex flex-col bg-ink-900 text-white">
      {/* top bar */}
      <div className="flex flex-shrink-0 items-center gap-3 border-b border-white/10 px-4 py-2.5">
        <button
          onClick={onClose}
          aria-label={t("common.close")}
          className="grid h-8 w-8 place-items-center rounded-full text-white/70 hover:bg-white/10"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-white/50">
            {t("theory.badge")}
          </div>
          {title && <div className="truncate text-sm font-bold">{title}</div>}
        </div>
        <SourceBadge kind={kind} />
        {notes.length > 0 && (
          <button
            onClick={() => setShowNotes((s) => !s)}
            className={`inline-flex items-center gap-1.5 rounded-lg border border-white/20 px-3 py-1.5 font-mono text-[11px] font-bold ${
              showNotes ? "bg-sun-400 text-ink-900" : "text-white/70 hover:bg-white/10"
            }`}
          >
            <StickyNote className="h-3 w-3" />
            {t("theory.notes")}
          </button>
        )}
        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 px-3 py-1.5 font-mono text-[11px] font-bold text-white/70 hover:bg-white/10"
        >
          <ExternalLink className="h-3 w-3" />
          {t("theory.openExternal")}
        </a>
      </div>

      {/* body */}
      <div className="flex min-h-0 flex-1">
        <div className="grid flex-1 place-items-center overflow-auto p-6">
          <div className="w-full max-w-[1100px]">
            <iframe
              src={src}
              title={title || t("theory.badge")}
              className="aspect-video w-full rounded-[14px] bg-black"
              allowFullScreen
            />
            {subtitle && (
              <div className="mt-3 text-center text-sm text-white/60">{subtitle}</div>
            )}
          </div>
        </div>
        {showNotes && notes.length > 0 && (
          <div className="w-[300px] flex-shrink-0 overflow-y-auto border-l border-sun-400 bg-sun-400/10 p-4 text-white/85">
            <div className="mb-2 inline-flex items-center gap-1.5 font-mono text-[10px] font-extrabold uppercase tracking-wider text-sun-400">
              <StickyNote className="h-3 w-3" />
              {t("theory.speakerNotes")}
            </div>
            {notes.map((n, i) => (
              <p key={i} className="mt-2 text-sm leading-relaxed">
                {n}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
