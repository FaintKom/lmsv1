"use client";

/**
 * HighlightableContent — wraps rendered theory/lesson text and lets the
 * student highlight or underline passages. Marks persist per (user, lesson)
 * via /progress/lessons/{id}/highlights (design handoff 2026-06, theory.jsx).
 *
 * Anchoring model: a mark is [start, end) character offsets into the plain
 * textContent of the inner content wrapper (children only — the floating
 * toolbar lives OUTSIDE that wrapper so its label text never shifts offsets).
 * The selected snippet is stored alongside; on re-anchor we compare it with
 * textContent.slice(start, end) and silently drop stale marks after content
 * edits. Term hover hints (span[data-term]) are pure CSS — see globals.css.
 *
 * Mark spans wrap text-node segments and never change textContent, so marks
 * already applied don't disturb the offsets of later ones.
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  useCreateHighlight,
  useDeleteHighlight,
  useHighlights,
  type HighlightKind,
  type LessonHighlight,
} from "@/lib/api/highlights";
import { useTranslation } from "@/lib/i18n/context";

/** Elements whose text we never wrap (fragile generated markup). */
const NO_WRAP_SELECTOR = ".katex, .katex-display, script, style, svg";

function collectTextNodes(root: HTMLElement): Text[] {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  let n = walker.nextNode();
  while (n) {
    nodes.push(n as Text);
    n = walker.nextNode();
  }
  return nodes;
}

/** Selection range → [start, end) offsets in root's full textContent. */
function rangeToOffsets(
  root: HTMLElement,
  range: Range
): { start: number; end: number } | null {
  const pre = document.createRange();
  pre.selectNodeContents(root);
  try {
    pre.setEnd(range.startContainer, range.startOffset);
  } catch {
    return null;
  }
  const start = pre.toString().length;
  const end = start + range.toString().length;
  if (end <= start) return null;
  return { start, end };
}

function unwrapMarks(root: HTMLElement): void {
  root.querySelectorAll("[data-annot-id]").forEach((el) => {
    el.replaceWith(...Array.from(el.childNodes));
  });
  root.normalize();
}

/** Wrap [start, end) of root's textContent in mark spans. */
function applyMark(
  root: HTMLElement,
  mark: LessonHighlight,
  removeHint: string
): void {
  const text = root.textContent ?? "";
  if (mark.end_offset > text.length) return;
  if (
    mark.text_snippet &&
    text.slice(mark.start_offset, mark.end_offset) !== mark.text_snippet
  ) {
    return; // content changed since the mark was made — drop silently
  }
  // Collect target segments first (splitting one node never moves another).
  const segments: { node: Text; local: number; len: number }[] = [];
  let pos = 0;
  for (const node of collectTextNodes(root)) {
    const len = node.length;
    const s = Math.max(mark.start_offset, pos);
    const e = Math.min(mark.end_offset, pos + len);
    if (s < e && !node.parentElement?.closest(NO_WRAP_SELECTOR)) {
      segments.push({ node, local: s - pos, len: e - s });
    }
    pos += len;
    if (pos >= mark.end_offset) break;
  }
  for (const seg of segments) {
    const target =
      seg.local > 0 ? seg.node.splitText(seg.local) : seg.node;
    if (target.length > seg.len) target.splitText(seg.len);
    const span = document.createElement("span");
    span.className = mark.kind === "underline" ? "th-ul" : "th-hl";
    span.dataset.annotId = mark.id;
    span.title = removeHint;
    target.parentNode?.insertBefore(span, target);
    span.appendChild(target);
  }
}

interface ToolbarState {
  x: number;
  y: number;
}

export function HighlightableContent({
  lessonId,
  blockKey,
  children,
  className,
}: {
  lessonId: string;
  /** Anchor scope for multi-block lessons ("block-0", "legacy", …). */
  blockKey: string;
  children: ReactNode;
  className?: string;
}) {
  const { t } = useTranslation();
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [tool, setTool] = useState<ToolbarState | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: highlights } = useHighlights(lessonId);
  const createMut = useCreateHighlight();
  const deleteMut = useDeleteHighlight(lessonId);

  /* ── re-anchor marks whenever data or content changes ─────────────── */
  const apply = useCallback(() => {
    const root = contentRef.current;
    if (!root || !highlights) return;
    unwrapMarks(root);
    const removeHint = t("theory.removeMarkHint");
    for (const h of highlights) {
      if (h.block_key === blockKey) applyMark(root, h, removeHint);
    }
  }, [highlights, t, blockKey]);

  useEffect(() => {
    // Content under us renders async (markdown / TipTap read-only / KaTeX),
    // so retry a few times after mount; apply() is idempotent.
    apply();
    const timers = [50, 400, 1200].map((ms) => window.setTimeout(apply, ms));
    return () => timers.forEach(clearTimeout);
  }, [apply]);

  /* ── selection → floating toolbar ──────────────────────────────────── */
  const onSelectionEnd = useCallback(() => {
    window.setTimeout(() => {
      const root = contentRef.current;
      const wrap = wrapRef.current;
      const sel = window.getSelection();
      if (!root || !wrap || !sel || sel.isCollapsed || sel.rangeCount === 0) {
        setTool(null);
        return;
      }
      const range = sel.getRangeAt(0);
      if (
        !root.contains(range.startContainer) ||
        !root.contains(range.endContainer)
      ) {
        setTool(null);
        return;
      }
      const rect = range.getBoundingClientRect();
      const wrapRect = wrap.getBoundingClientRect();
      setTool({
        x: Math.max(70, rect.left + rect.width / 2 - wrapRect.left),
        y: rect.top - wrapRect.top - 44,
      });
    }, 0);
  }, []);

  const annotate = useCallback(
    (kind: HighlightKind) => {
      const root = contentRef.current;
      const sel = window.getSelection();
      if (!root || !sel || sel.isCollapsed || sel.rangeCount === 0) return;
      const offsets = rangeToOffsets(root, sel.getRangeAt(0));
      setTool(null);
      sel.removeAllRanges();
      if (!offsets) return;
      const snippet = (root.textContent ?? "").slice(
        offsets.start,
        offsets.end
      );
      createMut.mutate({
        lessonId,
        blockKey,
        startOffset: offsets.start,
        endOffset: offsets.end,
        kind,
        textSnippet: snippet.slice(0, 500),
      });
    },
    [createMut, lessonId, blockKey]
  );

  const copySelection = useCallback(() => {
    const sel = window.getSelection();
    if (sel && !sel.isCollapsed) {
      navigator.clipboard?.writeText(sel.toString()).catch(() => undefined);
    }
    sel?.removeAllRanges();
    setTool(null);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }, []);

  /* ── click a mark → delete it ──────────────────────────────────────── */
  const onContentClick = useCallback(
    (e: React.MouseEvent) => {
      const el = (e.target as HTMLElement).closest?.("[data-annot-id]");
      const id = el instanceof HTMLElement ? el.dataset.annotId : undefined;
      if (!id) return;
      el?.replaceWith(...Array.from(el.childNodes)); // optimistic
      deleteMut.mutate(id);
    },
    [deleteMut]
  );

  return (
    <div ref={wrapRef} className={"th-annot relative " + (className ?? "")}>
      {tool && (
        <div
          className="th-seltool"
          style={{ left: tool.x - 70, top: tool.y }}
        >
          <button onClick={() => annotate("highlight")}>
            <span className="swatch" style={{ background: "var(--sun-300)" }} />
            {t("theory.highlightAction")}
          </button>
          <button onClick={() => annotate("underline")}>
            <span
              className="swatch"
              style={{
                background: "transparent",
                borderBottom: "2.5px solid var(--green-500)",
                borderRadius: 0,
              }}
            />
            {t("theory.underlineAction")}
          </button>
          <button onClick={copySelection}>{t("theory.copyAction")}</button>
        </div>
      )}
      {copied && (
        <div
          className="th-seltool"
          style={{
            position: "fixed",
            left: "50%",
            bottom: 90,
            top: "auto",
            transform: "translateX(-50%)",
          }}
        >
          <button style={{ cursor: "default" }}>
            {t("theory.copiedToast")}
          </button>
        </div>
      )}
      <div
        ref={contentRef}
        onMouseUp={onSelectionEnd}
        onTouchEnd={onSelectionEnd}
        onClick={onContentClick}
      >
        {children}
      </div>
    </div>
  );
}
