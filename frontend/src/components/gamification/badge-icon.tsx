import {
  Award,
  BookOpen,
  Calculator,
  CheckCircle,
  Code,
  Flame,
  GraduationCap,
  Languages,
  Sparkles,
  Star,
  Trophy,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Entry = { Icon: LucideIcon; color: string; filled?: boolean };

const MAP: Record<string, Entry> = {
  streak_3: { Icon: Flame, color: "text-coral-500" },
  streak_7: { Icon: Flame, color: "text-coral-500" },
  streak_14: { Icon: Flame, color: "text-coral-500" },
  streak_30: { Icon: Flame, color: "text-coral-700" },
  streak_100: { Icon: Flame, color: "text-coral-700" },

  lessons_1: { Icon: BookOpen, color: "text-green-600" },
  lessons_10: { Icon: BookOpen, color: "text-green-600" },
  lessons_50: { Icon: GraduationCap, color: "text-green-700" },
  lessons_100: { Icon: GraduationCap, color: "text-green-800" },

  quiz_first: { Icon: CheckCircle, color: "text-green-600" },
  quiz_perfect: { Icon: Star, color: "text-yellow-500", filled: true },
  quiz_master: { Icon: Award, color: "text-yellow-700" },

  code_first: { Icon: Code, color: "text-blue-600" },
  code_5: { Icon: Code, color: "text-blue-600" },
  code_master: { Icon: Code, color: "text-gray-900" },

  math_first: { Icon: Calculator, color: "text-green-600" },
  math_perfect: { Icon: Calculator, color: "text-green-800" },

  lang_first: { Icon: Languages, color: "text-coral-500" },
  lang_master: { Icon: Languages, color: "text-coral-700" },

  course_complete: { Icon: Award, color: "text-green-700" },
  course_5: { Icon: Trophy, color: "text-yellow-500" },

  xp_500: { Icon: Zap, color: "text-yellow-500", filled: true },
  xp_5000: { Icon: Zap, color: "text-yellow-700", filled: true },

  early_bird: { Icon: Sparkles, color: "text-blue-600" },
  night_owl: { Icon: Sparkles, color: "text-gray-700" },
};

const FALLBACK: Entry = { Icon: Trophy, color: "text-yellow-700" };

interface BadgeIconProps {
  criteriaKey: string;
  size?: number;
  className?: string;
}

export function BadgeIcon({ criteriaKey, size = 28, className }: BadgeIconProps) {
  const entry = MAP[criteriaKey] ?? FALLBACK;
  const { Icon, color, filled } = entry;
  return (
    <Icon
      width={size}
      height={size}
      className={cn(color, className)}
      fill={filled ? "currentColor" : "none"}
      strokeWidth={2}
    />
  );
}
