"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Flame, Medal, Star, Trophy, Zap } from "lucide-react";

import apiClient from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface LeagueInfo {
  name: string;
  icon: string;
  min_xp: number;
  color: string;
  next_league: string | null;
  next_xp: number | null;
  progress: number;
}

interface LeaderboardEntry {
  user_id: string;
  user_name: string;
  completed_lessons: number;
  current_streak: number;
  badge_count: number;
  total_xp: number;
  league: LeagueInfo | null;
}

const LEAGUE_CONFIG: Record<string, { bg: string; text: string; border: string; icon: string }> = {
  bronze: {
    bg: "bg-amber-100 dark:bg-amber-500/20",
    text: "text-amber-700 dark:text-amber-400",
    border: "border-amber-300 dark:border-amber-500/40",
    icon: "\uD83E\uDD49",
  },
  silver: {
    bg: "bg-slate-100 dark:bg-slate-500/20",
    text: "text-slate-600 dark:text-slate-300",
    border: "border-slate-300 dark:border-slate-500/40",
    icon: "\uD83E\uDD48",
  },
  gold: {
    bg: "bg-yellow-100 dark:bg-yellow-500/20",
    text: "text-yellow-700 dark:text-yellow-400",
    border: "border-yellow-300 dark:border-yellow-500/40",
    icon: "\uD83E\uDD47",
  },
  platinum: {
    bg: "bg-cyan-100 dark:bg-cyan-500/20",
    text: "text-cyan-700 dark:text-cyan-400",
    border: "border-cyan-300 dark:border-cyan-500/40",
    icon: "\uD83D\uDC8E",
  },
  diamond: {
    bg: "bg-violet-100 dark:bg-violet-500/20",
    text: "text-violet-700 dark:text-violet-400",
    border: "border-violet-300 dark:border-violet-500/40",
    icon: "\u2B50",
  },
};

function getLeagueStyle(league: LeagueInfo | null) {
  if (!league) return LEAGUE_CONFIG.bronze;
  const key = league.name.toLowerCase();
  return LEAGUE_CONFIG[key] || LEAGUE_CONFIG.bronze;
}

function getRankStyle(rank: number) {
  if (rank === 1) return "bg-gradient-to-r from-yellow-400 to-amber-500 text-white shadow-lg shadow-yellow-200/50 dark:shadow-yellow-500/20";
  if (rank === 2) return "bg-gradient-to-r from-slate-300 to-slate-400 text-white shadow-lg shadow-slate-200/50 dark:shadow-slate-500/20";
  if (rank === 3) return "bg-gradient-to-r from-amber-600 to-orange-700 text-white shadow-lg shadow-orange-200/50 dark:shadow-orange-500/20";
  return "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-400";
}

function getRankIcon(rank: number) {
  if (rank === 1) return <Trophy className="h-4 w-4" />;
  if (rank === 2) return <Medal className="h-4 w-4" />;
  if (rank === 3) return <Medal className="h-4 w-4" />;
  return null;
}

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    apiClient
      .get("/gamification/leaderboard")
      .then(({ data }) => setEntries(data))
      .catch(() => toast.error("Failed to load leaderboard"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-green-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Leaderboard</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          See how you rank among your classmates
        </p>
      </div>

      {/* Top 3 Podium */}
      {entries.length >= 3 && (
        <div className="mb-8 flex items-end justify-center gap-4">
          {/* 2nd place */}
          <PodiumCard entry={entries[1]} rank={2} />
          {/* 1st place */}
          <PodiumCard entry={entries[0]} rank={1} isFirst />
          {/* 3rd place */}
          <PodiumCard entry={entries[2]} rank={3} />
        </div>
      )}

      {/* Full list */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Star className="h-4 w-4 text-yellow-500" />
            Rankings
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {entries.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
              No leaderboard data yet. Complete lessons to earn XP!
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-white/5">
              {entries.map((entry, i) => {
                const rank = i + 1;
                const isCurrentUser = user?.id === entry.user_id;
                const leagueStyle = getLeagueStyle(entry.league);

                return (
                  <div
                    key={entry.user_id}
                    className={`flex items-center gap-4 px-4 py-3 transition-colors ${
                      isCurrentUser
                        ? "bg-green-50 dark:bg-green-500/10"
                        : "hover:bg-slate-50 dark:hover:bg-white/5"
                    }`}
                  >
                    {/* Rank */}
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${getRankStyle(rank)}`}
                    >
                      {getRankIcon(rank) || rank}
                    </div>

                    {/* Avatar */}
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-emerald-500 text-sm font-semibold text-white shadow-sm">
                      {entry.user_name?.charAt(0)?.toUpperCase() || "?"}
                    </div>

                    {/* Name + league */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className={`truncate text-sm font-semibold ${isCurrentUser ? "text-green-700 dark:text-green-300" : "text-slate-900 dark:text-slate-100"}`}>
                          {entry.user_name}
                          {isCurrentUser && (
                            <span className="ml-1.5 text-xs font-normal text-green-600 dark:text-green-400">(You)</span>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {entry.league && (
                          <span
                            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${leagueStyle.bg} ${leagueStyle.text} ${leagueStyle.border}`}
                          >
                            {leagueStyle.icon} {entry.league.name}
                          </span>
                        )}
                        {entry.current_streak > 0 && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] text-orange-500">
                            <Flame className="h-3 w-3" />
                            {entry.current_streak}d
                          </span>
                        )}
                      </div>
                    </div>

                    {/* XP */}
                    <div className="text-right">
                      <p className="flex items-center gap-1 text-sm font-bold text-slate-900 dark:text-slate-100">
                        <Zap className="h-3.5 w-3.5 text-yellow-500" />
                        {entry.total_xp.toLocaleString()}
                      </p>
                      <p className="text-[10px] text-slate-400">XP</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function PodiumCard({
  entry,
  rank,
  isFirst,
}: {
  entry: LeaderboardEntry;
  rank: number;
  isFirst?: boolean;
}) {
  const leagueStyle = getLeagueStyle(entry.league);
  const heights = { 1: "h-36", 2: "h-28", 3: "h-24" };
  const medalEmoji = rank === 1 ? "\uD83E\uDD47" : rank === 2 ? "\uD83E\uDD48" : "\uD83E\uDD49";

  return (
    <div className={`flex flex-col items-center ${isFirst ? "mb-4" : ""}`}>
      <div className="relative mb-2">
        <div
          className={`flex items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-emerald-500 text-white font-bold shadow-lg ${
            isFirst ? "h-16 w-16 text-xl" : "h-12 w-12 text-base"
          }`}
        >
          {entry.user_name?.charAt(0)?.toUpperCase() || "?"}
        </div>
        <span className="absolute -bottom-1 -right-1 text-lg">{medalEmoji}</span>
      </div>
      <p className="max-w-[100px] truncate text-center text-xs font-semibold text-slate-900 dark:text-slate-100">
        {entry.user_name}
      </p>
      {entry.league && (
        <span
          className={`mt-1 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-semibold ${leagueStyle.bg} ${leagueStyle.text} ${leagueStyle.border}`}
        >
          {leagueStyle.icon} {entry.league.name}
        </span>
      )}
      <div className="mt-1 flex items-center gap-0.5 text-xs font-bold text-yellow-600 dark:text-yellow-400">
        <Zap className="h-3 w-3" />
        {entry.total_xp.toLocaleString()}
      </div>
      <div
        className={`mt-2 w-20 rounded-t-lg ${
          rank === 1
            ? "bg-yellow-400 dark:bg-yellow-500"
            : rank === 2
            ? "bg-slate-300 dark:bg-slate-500"
            : "bg-amber-600 dark:bg-amber-700"
        } ${heights[rank as 1 | 2 | 3]}`}
      />
    </div>
  );
}
