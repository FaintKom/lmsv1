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
        "inline-flex items-center gap-2 rounded-full bg-clay-500 py-1.5 pl-1.5 pr-3.5 text-sm font-extrabold text-white shadow-md",
        className
      )}
    >
      <span className="grid h-5 w-5 place-items-center rounded-full bg-white text-clay-500">
        <Flame size={12} fill="currentColor" />
      </span>
      {days}
      <span className="opacity-80">day{days === 1 ? "" : "s"}</span>
    </span>
  );
}
