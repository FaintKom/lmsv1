"use client";

import { useEffect, useState } from "react";
import apiClient from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BadgeCard } from "@/components/gamification/badge-card";
import { Trophy, Flame, Medal, Star, Zap, TrendingUp } from "lucide-react";

interface BadgeData {
  id: string;
  name: string;
  description: string;
  icon: string;
  criteria_key: string;
  earned: boolean;
  earned_at: string | null;
}

interface LeagueInfo {
  name: string;
  icon: string;
  min_xp: number;
  color: string;
  next_league: string | null;
  next_xp: number | null;
  progress: number;
}

interface StreakData {
  current_streak: number;
  longest_streak: number;
  last_activity_date: string | null;
  total_xp: number;
  league: LeagueInfo | null;
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

export default function AchievementsPage() {
  const [badges, setBadges] = useState<BadgeData[]>([]);
  const [streak, setStreak] = useState<StreakData | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiClient.get("/gamification/my-badges").then(({ data }) => data),
      apiClient.get("/gamification/my-streak").then(({ data }) => data),
      apiClient.get("/gamification/leaderboard").then(({ data }) => data),
    ])
      .then(([badgesData, streakData, lbData]) => {
        setBadges(badgesData);
        setStreak(streakData);
        setLeaderboard(lbData);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  const earnedCount = badges.filter((b) => b.earned).length;
  const league = streak?.league;

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Achievements</h1>
        <p className="mt-1 text-sm text-slate-500">
          Track your progress, earn XP, and climb the leagues
        </p>
      </div>

      {/* XP & League Card */}
      {league && (
        <Card className="mb-6 overflow-hidden">
          <CardContent className="p-0">
            <div className="flex flex-col sm:flex-row">
              {/* League info */}
              <div className="flex items-center gap-4 p-6" style={{ background: `${league.color}15` }}>
                <span className="text-5xl">{league.icon}</span>
                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Current League</p>
                  <p className="text-2xl font-bold" style={{ color: league.color === "#FFD700" ? "#B8860B" : league.color === "#C0C0C0" ? "#6B7280" : league.color }}>
                    {league.name}
                  </p>
                </div>
              </div>
              {/* XP info */}
              <div className="flex flex-1 items-center gap-6 p-6">
                <div className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-yellow-500" />
                  <div>
                    <p className="text-xs text-slate-400">Total XP</p>
                    <p className="text-xl font-bold text-slate-900">{streak?.total_xp || 0}</p>
                  </div>
                </div>
                {league.next_league && (
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                      <span>Progress to {league.next_league}</span>
                      <span>{streak?.total_xp || 0} / {league.next_xp} XP</span>
                    </div>
                    <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(league.progress, 100)}%`,
                          background: `linear-gradient(90deg, ${league.color}, ${league.color}cc)`,
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats row */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Card className="border-l-4 border-l-yellow-400 hover:shadow-md">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-xl bg-yellow-100 p-3">
              <Zap className="h-5 w-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400">Total XP</p>
              <p className="text-2xl font-bold text-slate-900">
                {streak?.total_xp || 0}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-400 hover:shadow-md">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-xl bg-orange-100 p-3">
              <Flame className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400">Current Streak</p>
              <p className="text-2xl font-bold text-slate-900">
                {streak?.current_streak || 0} days
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-400 hover:shadow-md">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-xl bg-amber-100 p-3">
              <Trophy className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400">Badges Earned</p>
              <p className="text-2xl font-bold text-slate-900">
                {earnedCount} / {badges.length}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-indigo-400 hover:shadow-md">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-xl bg-indigo-100 p-3">
              <TrendingUp className="h-5 w-5 text-indigo-500" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400">Longest Streak</p>
              <p className="text-2xl font-bold text-slate-900">
                {streak?.longest_streak || 0} days
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Badges */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Trophy className="h-4 w-4 text-amber-500" />
                All Badges
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {badges.map((badge) => (
                  <BadgeCard
                    key={badge.id}
                    name={badge.name}
                    description={badge.description}
                    icon={badge.icon}
                    earned={badge.earned}
                    earnedAt={badge.earned_at}
                  />
                ))}
              </div>
              {badges.length === 0 && (
                <p className="py-8 text-center text-sm text-slate-400">
                  No badges available yet
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Leaderboard */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Medal className="h-4 w-4 text-indigo-500" />
                Leaderboard
              </CardTitle>
            </CardHeader>
            <CardContent>
              {leaderboard.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-400">
                  No students yet
                </p>
              ) : (
                <div className="space-y-2">
                  {leaderboard.map((entry, i) => (
                    <div
                      key={entry.user_id}
                      className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2"
                    >
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                          i === 0
                            ? "bg-amber-100 text-amber-700"
                            : i === 1
                            ? "bg-slate-200 text-slate-600"
                            : i === 2
                            ? "bg-orange-100 text-orange-600"
                            : "bg-slate-100 text-slate-400"
                        }`}
                      >
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="truncate text-sm font-medium text-slate-700">
                            {entry.user_name}
                          </p>
                          {entry.league && (
                            <span className="text-xs" title={entry.league.name}>
                              {entry.league.icon}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400">
                          {entry.total_xp} XP · {entry.completed_lessons} lessons · {entry.badge_count} badges
                        </p>
                      </div>
                      {entry.current_streak > 0 && (
                        <span className="flex items-center gap-0.5 text-[10px] font-medium text-orange-500">
                          <Flame className="h-3 w-3" />
                          {entry.current_streak}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* XP Earning Guide */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Star className="h-4 w-4 text-yellow-500" />
            How to Earn XP
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-lg bg-blue-50 p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">+10</p>
              <p className="mt-1 text-xs text-blue-500">Complete a lesson</p>
            </div>
            <div className="rounded-lg bg-emerald-50 p-4 text-center">
              <p className="text-2xl font-bold text-emerald-600">+25</p>
              <p className="mt-1 text-xs text-emerald-500">Pass a quiz</p>
            </div>
            <div className="rounded-lg bg-violet-50 p-4 text-center">
              <p className="text-2xl font-bold text-violet-600">+50</p>
              <p className="mt-1 text-xs text-violet-500">Pass a code challenge</p>
            </div>
            <div className="rounded-lg bg-orange-50 p-4 text-center">
              <p className="text-2xl font-bold text-orange-600">+5</p>
              <p className="mt-1 text-xs text-orange-500">Daily streak bonus</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
