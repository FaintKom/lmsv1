"use client";

import type { CSSProperties } from "react";

import { useTranslation } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

/**
 * The one progress bar (specs/071, FR-008; motion M2 in MOTION.md).
 *
 * The fill is scaled, never resized: `.progress-fill` sets
 * `transform: scaleX(--p)` and `@starting-style` grows it from zero on first
 * paint, so the bar fills in once without JavaScript and without a layout
 * pass per frame. Under reduced motion the global rule collapses the
 * transition and the bar simply appears at its value.
 */
export function ProgressBar({
  value,
  label,
  size = "md",
  className,
  fillClassName = "bg-primary",
  fillStyle,
}: {
  /** 0–100; clamped. */
  value: number;
  /** Accessible name; defaults to "Progress" in the UI language. */
  label?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  fillClassName?: string;
  fillStyle?: CSSProperties;
}) {
  const { t } = useTranslation();
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label ?? t("common.progress")}
      className={cn(
        "w-full overflow-hidden rounded-pill bg-surface-2",
        { "h-1.5": size === "sm", "h-2.5": size === "md", "h-3": size === "lg" },
        className,
      )}
    >
      <div
        className={cn("progress-fill h-full rounded-pill", fillClassName)}
        style={{ "--p": pct / 100, ...fillStyle } as CSSProperties}
      />
    </div>
  );
}
