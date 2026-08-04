import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

type ChipVariant =
  | "green"
  | "sun"
  | "clay"
  | "ink"
  | "solid-green"
  | "solid-ink"
  | "solid-clay";

interface ChipProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: ChipVariant;
  dot?: boolean;
  mono?: boolean;
}

const VARIANT_CLASSES: Record<ChipVariant, string> = {
  green: "bg-primary-soft text-success-fg",
  sun: "bg-warning-soft text-warning-fg",
  clay: "bg-danger-soft text-danger-fg",
  ink: "bg-surface-2 text-text-muted",
  "solid-green": "bg-primary text-primary-fg",
  "solid-ink": "bg-ink-900 text-white",
  "solid-clay": "bg-clay-500 text-white",
};

export function Chip({
  variant = "green",
  dot = false,
  mono = false,
  className,
  children,
  ...props
}: ChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold",
        mono && "font-mono uppercase tracking-[0.06em] text-2xs",
        VARIANT_CLASSES[variant],
        className
      )}
      {...props}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />}
      {children}
    </span>
  );
}
