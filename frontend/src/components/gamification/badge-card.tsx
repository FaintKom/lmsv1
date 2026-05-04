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
          ? "border-sun-100 dark:border-sun-500/30 bg-gradient-to-b from-sun-50 dark:from-sun-500/10 to-white dark:to-transparent shadow-sm"
          : "border-ink-200 dark:border-white/10 bg-ink-50 dark:bg-white/5 opacity-50 grayscale"
      }`}
    >
      <div className="mb-2 text-3xl">{icon}</div>
      <h3 className={`text-sm font-semibold ${earned ? "text-ink-900 dark:text-ink-200" : "text-ink-500 dark:text-ink-400"}`}>
        {name}
      </h3>
      <p className="mt-0.5 text-xs text-ink-500 dark:text-ink-400">{description}</p>
      {earned && earnedAt && (
        <p className="mt-2 text-xs font-medium text-sun-500">
          Earned {new Date(earnedAt).toLocaleDateString()}
        </p>
      )}
    </div>
  );
}
