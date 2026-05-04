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
 className={`rounded-lg border p-4 text-center transition-all ${
 earned
 ? "border-warning bg-gradient-to-b from-amber-50 to-white shadow-sm"
 : "border-border-strong bg-surface-2 opacity-50 grayscale"
 }`}
 >
 <div className="mb-2 text-3xl">{icon}</div>
 <h3 className={`text-sm font-semibold ${earned ? "text-ink-700 " : "text-text-muted "}`}>
 {name}
 </h3>
 <p className="mt-0.5 text-xs text-text-muted ">{description}</p>
 {earned && earnedAt && (
 <p className="mt-2 text-xs font-medium text-warning-fg">
 Earned {new Date(earnedAt).toLocaleDateString()}
 </p>
 )}
 </div>
 );
}
