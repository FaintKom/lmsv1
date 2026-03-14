"use client";

import { useEffect, useState } from "react";
import apiClient from "@/lib/api-client";
import { Flame } from "lucide-react";

export function StreakWidget() {
  const [streak, setStreak] = useState(0);
  const [longest, setLongest] = useState(0);

  useEffect(() => {
    apiClient
      .get("/gamification/my-streak")
      .then(({ data }) => {
        setStreak(data.current_streak);
        setLongest(data.longest_streak);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="flex items-center gap-3">
      <div className={`rounded-xl p-3 ${streak > 0 ? "bg-orange-50" : "bg-slate-50"}`}>
        <Flame className={`h-5 w-5 ${streak > 0 ? "text-orange-500" : "text-slate-400"}`} />
      </div>
      <div>
        <p className="text-xs font-medium text-slate-400">Streak</p>
        <p className="text-2xl font-bold text-slate-900">{streak} days</p>
        {longest > streak && (
          <p className="text-[10px] text-slate-400">Best: {longest} days</p>
        )}
      </div>
    </div>
  );
}
