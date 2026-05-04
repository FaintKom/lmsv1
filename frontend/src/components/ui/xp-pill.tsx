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
        "inline-flex items-center gap-1.5 rounded-full bg-sun-300 py-1 pl-1.5 pr-3 text-xs font-extrabold text-sun-700",
        className
      )}
    >
      <span className="grid h-4 w-4 place-items-center rounded-full bg-sun-700 text-sun-300">
        <Star size={9} fill="currentColor" />
      </span>
      {xp.toLocaleString()} XP
    </span>
  );
}
