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
          ? "border-amber-200 bg-gradient-to-b from-amber-50 to-white shadow-sm"
          : "border-slate-200 bg-slate-50 opacity-50 grayscale"
      }`}
    >
      <div className="mb-2 text-3xl">{icon}</div>
      <h3 className={`text-sm font-semibold ${earned ? "text-slate-800" : "text-slate-500"}`}>
        {name}
      </h3>
      <p className="mt-0.5 text-[11px] text-slate-400">{description}</p>
      {earned && earnedAt && (
        <p className="mt-2 text-[10px] font-medium text-amber-600">
          Earned {new Date(earnedAt).toLocaleDateString()}
        </p>
      )}
    </div>
  );
}
