import { cn } from "@/lib/utils";
import { Flame } from "lucide-react";

interface StreakPillProps {
  days: number;
  className?: string;
}

export function StreakPill({ days, className }: StreakPillProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full bg-danger-soft py-1.5 pl-2.5 pr-3.5 text-sm font-semibold text-danger-fg",
        className
      )}
    >
      <Flame size={14} fill="currentColor" aria-hidden />
      {days}
      <span className="opacity-80">day{days === 1 ? "" : "s"}</span>
    </span>
  );
}
