"use client";

import { useEffect, useState } from "react";
import apiClient from "@/lib/api-client";
import { Flame, Star } from "lucide-react";

export function StreakWidget() {
 const [streak, setStreak] = useState(0);
 const [longest, setLongest] = useState(0);
 const [xp, setXp] = useState(0);
 const [league, setLeague] = useState<{ name: string; icon: string } | null>(null);

 useEffect(() => {
 apiClient
 .get("/gamification/my-streak")
 .then(({ data }) => {
 setStreak(data.current_streak);
 setLongest(data.longest_streak);
 setXp(data.total_xp || 0);
 setLeague(data.league || null);
 })
 .catch(() => {});
 }, []);

 return (
 <div className="flex items-center gap-3">
 <div className={`rounded-lg p-3 ${streak > 0 ? "bg-coral-50 " : "bg-surface-2 "}`}>
 <Flame className={`h-5 w-5 ${streak > 0 ? "text-coral-700" : "text-text-subtle"}`} />
 </div>
 <div className="flex-1">
 <p className="text-xs font-medium text-text-muted ">Streak</p>
 <p className="text-2xl font-bold text-text ">{streak} days</p>
 <div className="flex items-center gap-2">
 {longest > streak && (
 <span className="text-xs text-text-muted">Best: {longest} days</span>
 )}
 {xp > 0 && (
 <span className="flex items-center gap-0.5 text-xs font-medium text-warning-fg">
 <Star className="h-2.5 w-2.5" /> {xp} XP
 {league && <span className="ml-0.5">{league.icon}</span>}
 </span>
 )}
 </div>
 </div>
 </div>
 );
}
