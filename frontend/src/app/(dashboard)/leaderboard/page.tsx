"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Flame, Medal, Star, Trophy, Zap } from "lucide-react";

import apiClient from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/lib/i18n/context";

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
 bg: "bg-sun-100 ",
 text: "text-warning-fg ",
 border: "border-warning ",
 icon: "\uD83E\uDD49",
 },
 silver: {
 bg: "bg-ink-100 ",
 text: "text-text-muted ",
 border: "border-ink-300 ",
 icon: "\uD83E\uDD48",
 },
 gold: {
 bg: "bg-sun-100 ",
 text: "text-warning-fg ",
 border: "border-warning ",
 icon: "\uD83E\uDD47",
 },
 platinum: {
 bg: "bg-info-soft ",
 text: "text-info-fg ",
 border: "border-info ",
 icon: "\uD83D\uDC8E",
 },
 diamond: {
 bg: " ",
 text: "text-text ",
 border: "border-border ",
 icon: "\u2B50",
 },
};

function getLeagueStyle(league: LeagueInfo | null) {
 if (!league) return LEAGUE_CONFIG.bronze;
 const key = league.name.toLowerCase();
 return LEAGUE_CONFIG[key] || LEAGUE_CONFIG.bronze;
}

function getRankStyle(rank: number) {
 if (rank === 1) return "bg-gradient-to-r from-yellow-400 to-amber-500 text-white shadow-lg shadow-yellow-200/50 ";
 if (rank === 2) return "bg-gradient-to-r from-slate-300 to-slate-400 text-white shadow-lg shadow-ink-200/50 ";
 if (rank === 3) return "bg-gradient-to-r from-amber-600 to-orange-700 text-white shadow-lg shadow-orange-200/50 ";
 return "bg-ink-100 text-text-muted ";
}

function getRankIcon(rank: number) {
 if (rank === 1) return <Trophy className="h-4 w-4" />;
 if (rank === 2) return <Medal className="h-4 w-4" />;
 if (rank === 3) return <Medal className="h-4 w-4" />;
 return null;
}

export default function LeaderboardPage() {
 const { t } = useTranslation();
 const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
 const [loading, setLoading] = useState(true);
 const user = useAuthStore((s) => s.user);

 useEffect(() => {
 apiClient
 .get("/gamification/leaderboard")
 .then(({ data }) => setEntries(data))
 .catch(() => toast.error(t("leaderboard.failedToLoad")))
 .finally(() => setLoading(false));
 }, [t]);

 if (loading) {
 return (
 <div className="flex min-h-[50vh] items-center justify-center">
 <div className="h-8 w-8 animate-spin rounded-pill border-2 border-primary border-t-transparent" />
 </div>
 );
 }

 return (
 <div className="mx-auto max-w-3xl">
 <div className="mb-8 text-center">
 <h1 className="text-2xl font-bold text-text ">{t("leaderboard.title")}</h1>
 <p className="mt-1 text-sm text-text-muted ">
 {t("leaderboard.subtitle")}
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
 <Star className="h-4 w-4 text-warning-fg" />
 {t("leaderboard.rankings")}
 </CardTitle>
 </CardHeader>
 <CardContent className="p-0">
 {entries.length === 0 ? (
 <div className="p-8 text-center text-sm text-text-muted ">
 {t("leaderboard.empty")}
 </div>
 ) : (
 <div className="divide-y divide-border ">
 {entries.map((entry, i) => {
 const rank = i + 1;
 const isCurrentUser = user?.id === entry.user_id;
 const leagueStyle = getLeagueStyle(entry.league);

 return (
 <div
 key={entry.user_id}
 className={`flex items-center gap-4 px-4 py-3 transition-colors ${
 isCurrentUser
 ? "bg-success-soft "
 : "hover:bg-surface-2 "
 }`}
 >
 {/* Rank */}
 <div
 className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-pill text-xs font-bold ${getRankStyle(rank)}`}
 >
 {getRankIcon(rank) || rank}
 </div>

 {/* Avatar */}
 <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-pill bg-gradient-to-br from-green-500 to-emerald-500 text-sm font-semibold text-white shadow-sm">
 {entry.user_name?.charAt(0)?.toUpperCase() || "?"}
 </div>

 {/* Name + league */}
 <div className="min-w-0 flex-1">
 <div className="flex items-center gap-2">
 <p className={`truncate text-sm font-semibold ${isCurrentUser ? "text-success-fg " : "text-text "}`}>
 {entry.user_name}
 {isCurrentUser && (
 <span className="ml-1.5 text-xs font-normal text-primary ">{t("leaderboard.you")}</span>
 )}
 </p>
 </div>
 <div className="flex items-center gap-2 mt-0.5">
 {entry.league && (
 <span
 className={`inline-flex items-center gap-1 rounded-pill border px-2 py-0.5 text-[10px] font-semibold ${leagueStyle.bg} ${leagueStyle.text} ${leagueStyle.border}`}
 >
 {leagueStyle.icon} {entry.league.name}
 </span>
 )}
 {entry.current_streak > 0 && (
 <span className="inline-flex items-center gap-0.5 text-[10px] text-coral-700">
 <Flame className="h-3 w-3" />
 {entry.current_streak}d
 </span>
 )}
 </div>
 </div>

 {/* XP */}
 <div className="text-right">
 <p className="flex items-center gap-1 text-sm font-bold text-text ">
 <Zap className="h-3.5 w-3.5 text-warning-fg" />
 {entry.total_xp.toLocaleString()}
 </p>
 <p className="text-[10px] text-text-subtle">{t("leaderboard.xp")}</p>
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
 className={`flex items-center justify-center rounded-pill bg-gradient-to-br from-green-500 to-emerald-500 text-white font-bold shadow-lg ${
 isFirst ? "h-16 w-16 text-xl" : "h-12 w-12 text-base"
 }`}
 >
 {entry.user_name?.charAt(0)?.toUpperCase() || "?"}
 </div>
 <span className="absolute -bottom-1 -right-1 text-lg">{medalEmoji}</span>
 </div>
 <p className="max-w-[100px] truncate text-center text-xs font-semibold text-text ">
 {entry.user_name}
 </p>
 {entry.league && (
 <span
 className={`mt-1 inline-flex items-center gap-1 rounded-pill border px-2 py-0.5 text-[9px] font-semibold ${leagueStyle.bg} ${leagueStyle.text} ${leagueStyle.border}`}
 >
 {leagueStyle.icon} {entry.league.name}
 </span>
 )}
 <div className="mt-1 flex items-center gap-0.5 text-xs font-bold text-warning-fg ">
 <Zap className="h-3 w-3" />
 {entry.total_xp.toLocaleString()}
 </div>
 <div
 className={`mt-2 w-20 rounded-t-lg ${
 rank === 1
 ? "bg-sun-400 "
 : rank === 2
 ? "bg-ink-300 "
 : "bg-warning "
 } ${heights[rank as 1 | 2 | 3]}`}
 />
 </div>
 );
}
