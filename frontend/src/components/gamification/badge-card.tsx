"use client";

import { Lock } from "lucide-react";
import { BadgeIcon } from "@/components/gamification/badge-icon";
import { cn } from "@/lib/utils";

interface BadgeCardProps {
 name: string;
 description: string;
 criteriaKey: string;
 earned: boolean;
 earnedAt?: string | null;
}

export function BadgeCard({ name, description, criteriaKey, earned, earnedAt }: BadgeCardProps) {
 return (
 <div
 className={cn(
 "rounded-lg border p-4 text-center transition-all",
 earned
 ? "border-warning bg-gradient-to-b from-amber-50 to-white shadow-sm"
 : "border-border-strong bg-surface-2 opacity-60",
 )}
 >
 <div className="relative mx-auto mb-2 h-12 w-12">
 <span
 className={cn(
 "grid h-12 w-12 place-items-center rounded-full",
 earned ? "border-2 border-yellow-300 bg-white" : "bg-gray-100",
 )}
 >
 <BadgeIcon criteriaKey={criteriaKey} size={28} className={earned ? undefined : "opacity-50"} />
 </span>
 {!earned && (
 <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-gray-700 text-white shadow-sm">
 <Lock className="h-3 w-3" />
 </span>
 )}
 </div>
 <h3 className={cn("text-sm font-semibold", earned ? "text-ink-700" : "text-text-muted")}>
 {name}
 </h3>
 <p className="mt-0.5 text-xs text-text-muted">{description}</p>
 {earned && earnedAt && (
 <p className="mt-2 text-xs font-medium text-warning-fg">
 Earned {new Date(earnedAt).toLocaleDateString()}
 </p>
 )}
 </div>
 );
}
