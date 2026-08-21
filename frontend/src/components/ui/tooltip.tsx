"use client";

import { ReactNode, useCallback, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface TooltipProps {
  content: string;
  children: ReactNode;
  position?: "top" | "bottom" | "left" | "right";
}

/**
 * A label that appears beside its target on hover or focus.
 *
 * It renders into document.body rather than next to the child, and that is the
 * whole point. An absolutely positioned element extends the *scrollable* area
 * of any ancestor whose overflow is not `visible` — and the collapsed sidebar's
 * nav is `overflow-y-auto`, which under CSS rules raises overflow-x from
 * `visible` to `auto` as well. A tooltip sticking 88px past an 88px rail
 * therefore gave the menu a permanent horizontal scrollbar. It shipped that
 * way; this is the fix.
 *
 * A portalled element sits outside that ancestor chain, so it can be anywhere
 * on screen without adding a pixel of scroll to anything.
 */
export function Tooltip({ content, children, position = "top" }: TooltipProps) {
  const anchor = useRef<HTMLSpanElement>(null);
  const [at, setAt] = useState<{ top: number; left: number } | null>(null);

  const show = useCallback(() => {
    const r = anchor.current?.getBoundingClientRect();
    if (!r) return;
    // Viewport coordinates, because the tooltip is fixed. It does not follow
    // the target while scrolling — hover does not survive a scroll either.
    const spots = {
      top: { top: r.top - 8, left: r.left + r.width / 2 },
      bottom: { top: r.bottom + 8, left: r.left + r.width / 2 },
      left: { top: r.top + r.height / 2, left: r.left - 8 },
      right: { top: r.top + r.height / 2, left: r.right + 8 },
    };
    setAt(spots[position]);
  }, [position]);

  const hide = useCallback(() => setAt(null), []);

  return (
    <span
      ref={anchor}
      className="inline-block"
      onMouseEnter={show}
      onMouseLeave={hide}
      // Focus, not only hover: on the collapsed rail this label is the only
      // thing naming an icon, and a keyboard never produces hover.
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {at !== null &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            role="tooltip"
            style={{ top: at.top, left: at.left }}
            className={`pointer-events-none fixed z-[100] max-w-xs rounded-lg bg-ink-900 px-2.5 py-1.5 text-xs text-white shadow-lg ${originClasses[position]}`}
          >
            {content}
          </div>,
          document.body,
        )}
    </span>
  );
}

/** Which corner of the tooltip sits on the coordinate we computed. */
const originClasses: Record<string, string> = {
  top: "-translate-x-1/2 -translate-y-full",
  bottom: "-translate-x-1/2",
  left: "-translate-x-full -translate-y-1/2",
  right: "-translate-y-1/2",
};
