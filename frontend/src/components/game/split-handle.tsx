"use client";

/**
 * The line between the board and the editor, and a way to move it.
 *
 * The split was fixed at 480px: on a small laptop the pupil had a full-size
 * grid and four visible lines of code. Dragging this changes the board's
 * width, and the choice lasts as long as the tab does.
 *
 * Keyboard works too — the handle is a separator that takes arrow keys,
 * which is what a pupil who cannot drag needs.
 */

import { useCallback, useEffect, useRef, useState } from "react";

import { useTranslation } from "@/lib/i18n/context";

export interface SplitSize {
  /** Board width in pixels on a wide screen. */
  size: number;
  setSize: (n: number) => void;
}

const MIN = 260;
const MAX = 900;
const STEP = 40;

function clamp(n: number): number {
  return Math.min(MAX, Math.max(MIN, Math.round(n)));
}

/** Remembers the pupil's split for the life of the tab, per exercise. */
export function useSplitSize(storageKey: string, initial = 480): SplitSize {
  const [size, setSizeState] = useState(initial);

  useEffect(() => {
    const saved = sessionStorage.getItem(storageKey);
    if (saved) {
      const n = parseInt(saved, 10);
      if (Number.isFinite(n)) setSizeState(clamp(n));
    }
  }, [storageKey]);

  const setSize = useCallback(
    (n: number) => {
      const next = clamp(n);
      setSizeState(next);
      sessionStorage.setItem(storageKey, String(next));
    },
    [storageKey],
  );

  return { size, setSize };
}

export function SplitHandle({ size, setSize }: SplitSize) {
  const { t } = useTranslation();
  const dragging = useRef(false);
  const containerLeft = useRef<number | null>(null);

  useEffect(() => {
    const move = (e: PointerEvent) => {
      if (!dragging.current) return;
      // The board starts at the left edge of the exercise, so its width is
      // simply where the pointer is relative to that edge.
      setSize(e.clientX - (containerLeft.current ?? 0));
    };
    const up = () => {
      if (!dragging.current) return;
      dragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [setSize]);

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={t("game.resizeEditor")}
      title={t("game.resizeEditor")}
      aria-valuenow={size}
      aria-valuemin={MIN}
      aria-valuemax={MAX}
      tabIndex={0}
      onPointerDown={(e) => {
        containerLeft.current = e.currentTarget.parentElement?.getBoundingClientRect().left ?? 0;
        dragging.current = true;
        document.body.style.cursor = "col-resize";
        document.body.style.userSelect = "none";
      }}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          setSize(size - STEP);
        } else if (e.key === "ArrowRight") {
          e.preventDefault();
          setSize(size + STEP);
        }
      }}
      className="group hidden w-1.5 shrink-0 cursor-col-resize items-center justify-center transition-colors hover:bg-primary-soft focus:bg-primary-soft focus:outline-none lg:flex"
    >
      <div className="h-10 w-0.5 rounded-full bg-border-strong transition-colors group-hover:bg-primary" />
    </div>
  );
}
