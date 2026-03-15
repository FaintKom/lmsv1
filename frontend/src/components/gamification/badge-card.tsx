"use client";

interface BadgeCardProps {
  name: string;
  description: string;
  icon: string;
  earned: boolean;
  earnedAt?: string | null;
}

export function BadgeCard({ name, description, icon, earned, earnedAt }: BadgeCardProps) {
  return (
    <div
      className={`rounded-xl border p-4 text-center transition-all ${
        earned
          ? "border-amber-200 dark:border-amber-500/30 bg-gradient-to-b from-amber-50 dark:from-amber-500/10 to-white dark:to-transparent shadow-sm"
          : "border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 opacity-50 grayscale"
      }`}
    >
      <div className="mb-2 text-3xl">{icon}</div>
      <h3 className={`text-sm font-semibold ${earned ? "text-slate-800 dark:text-slate-200" : "text-slate-500 dark:text-slate-400"}`}>
        {name}
      </h3>
      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{description}</p>
      {earned && earnedAt && (
        <p className="mt-2 text-xs font-medium text-amber-600">
          Earned {new Date(earnedAt).toLocaleDateString()}
        </p>
      )}
    </div>
  );
}
