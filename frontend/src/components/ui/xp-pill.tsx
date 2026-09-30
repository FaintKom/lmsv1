import { cn } from "@/lib/utils";
import { Star } from "lucide-react";

interface XpPillProps {
  xp: number;
  className?: string;
}

export function XpPill({ xp, className }: XpPillProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-reward-soft py-1 pl-2.5 pr-3 text-xs font-semibold text-reward-fg",
        className
      )}
    >
      <Star size={12} fill="currentColor" aria-hidden />
      {xp.toLocaleString()} XP
    </span>
  );
}
