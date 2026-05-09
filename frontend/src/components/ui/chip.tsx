import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

type ChipVariant =
  | "green"
  | "sun"
  | "coral"
  | "ink"
  | "solid-green"
  | "solid-ink"
  | "solid-coral";

interface ChipProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: ChipVariant;
  dot?: boolean;
  mono?: boolean;
}

const VARIANT_CLASSES: Record<ChipVariant, string> = {
  green: "bg-primary-soft text-success-fg",
  sun: "bg-sun-100 text-sun-700",
  coral: "bg-coral-50 text-coral-700",
  ink: "bg-ink-100 text-ink-700",
  "solid-green": "bg-primary text-white",
  "solid-ink": "bg-ink-900 text-white",
  "solid-coral": "bg-coral-500 text-white",
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
        mono && "font-mono uppercase tracking-[0.06em] text-[11px]",
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
