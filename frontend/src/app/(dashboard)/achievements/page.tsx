"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import apiClient from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BadgeCard } from "@/components/gamification/badge-card";
import { LeagueMark, leagueKindFromName } from "@/components/gamification/league-mark";
import { useTranslation } from "@/lib/i18n/context";
import {
 Trophy, Flame, Medal, Star, Zap, TrendingUp,
 Award, Download, Loader2, Home, UserCircle,
} from "lucide-react";
import {
 RadarChart,
 PolarGrid,
 PolarAngleAxis,
 PolarRadiusAxis,
 Radar,
 ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";
import { RoomEditor } from "@/components/room/room-editor";
import { AvatarBuilderPanel } from "@/components/avatar/avatar-builder-panel";
import { AvatarCanvas } from "@/components/avatar/avatar-canvas";
import { useRoomState } from "@/hooks/use-room";

/* ── Interfaces ── */
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

interface CertificateData {
 id: string;
 course_id: string;
 course_title: string;
 certificate_number: string;
 issued_at: string;
}

interface UserSkill {
 skill_id: string;
 skill_name: string;
 skill_icon: string | null;
 category: string;
 total_xp: number;
 level: number;
}

interface RadarPoint {
 subject: string;
 value: number;
 level: number;
}

const CATEGORY_COLORS: Record<string, string> = {
 programming: "text-info-fg bg-info-soft ",
 math: "text-primary bg-primary-soft ",
 language: "text-primary bg-primary-soft ",
};

type Tab = "achievements" | "certificates" | "skills" | "room" | "avatar";

/** Tabs that swap the 3D scene + panel layout — they need full page width. */
const FULL_WIDTH_TABS: Tab[] = ["room", "avatar"];

/* ── Page ── */
const VALID_TABS: Tab[] = ["achievements", "certificates", "skills", "room", "avatar"];

export default function AchievementsPage() {
 const { t } = useTranslation();
 const searchParams = useSearchParams();
 const initialTab = useMemo<Tab>(() => {
   const qp = searchParams?.get("tab");
   return qp && VALID_TABS.includes(qp as Tab) ? (qp as Tab) : "achievements";
 }, [searchParams]);
 const [tab, setTab] = useState<Tab>(initialTab);
 const [loading, setLoading] = useState(true);

 // Achievements state
 const [badges, setBadges] = useState<BadgeData[]>([]);
 const [streak, setStreak] = useState<StreakData | null>(null);
 const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

 // Certificates state
 const [certificates, setCertificates] = useState<CertificateData[]>([]);

 // Skills state
 const [skills, setSkills] = useState<UserSkill[]>([]);
 const [radarData, setRadarData] = useState<RadarPoint[]>([]);

 useEffect(() => {
 Promise.all([
 apiClient.get("/gamification/my-badges").then(({ data }) => data),
 apiClient.get("/gamification/my-streak").then(({ data }) => data),
 apiClient.get("/gamification/leaderboard").then(({ data }) => data),
 apiClient.get("/certificates/my-certificates").then(({ data }) => data),
 apiClient.get("/skills/my").then(({ data }) => data),
 apiClient.get("/skills/radar").then(({ data }) => data),
 ])
 .then(([badgesData, streakData, lbData, certsData, skillsData, radarD]) => {
 setBadges(badgesData);
 setStreak(streakData);
 setLeaderboard(lbData);
 setCertificates(certsData);
 setSkills(skillsData);
 setRadarData(radarD);
 })
 .catch(() => {})
 .finally(() => setLoading(false));
 }, []);

 if (loading) {
 return (
 <div className="flex h-64 items-center justify-center">
 <div className="h-8 w-8 animate-spin rounded-pill border-4 border-primary border-t-transparent" />
 </div>
 );
 }

 const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
 { key: "achievements", label: t("nav.achievements") || "Achievements", icon: <Trophy className="h-4 w-4" /> },
 { key: "certificates", label: t("nav.certificates") || "Certificates", icon: <Award className="h-4 w-4" /> },
 { key: "skills", label: t("nav.skills") || "Skills", icon: <Zap className="h-4 w-4" /> },
 { key: "room", label: t("nav.myRoom") || "My room", icon: <Home className="h-4 w-4" /> },
 { key: "avatar", label: t("nav.myAvatar") || "My avatar", icon: <UserCircle className="h-4 w-4" /> },
 ];

 const isFullWidth = FULL_WIDTH_TABS.includes(tab);

 return (
 <div className={isFullWidth ? "" : "mx-auto max-w-6xl"}>
 <div className={cn("mb-6", isFullWidth && "mx-auto max-w-6xl px-4 lg:px-6")}>
 <h1 className="text-2xl font-bold text-text ">
 {t("nav.achievements") || "Achievements"}
 </h1>
 <p className="mt-1 text-base text-text-muted ">
 Track your progress, earn XP, and climb the leagues
 </p>
 </div>

 {/* Tabs */}
 <div className={cn(
 "mb-6 flex flex-wrap gap-1 rounded-lg bg-ink-100 p-1",
 isFullWidth && "mx-auto max-w-6xl px-4 lg:px-6"
 )} role="tablist">
 {tabs.map((tb) => (
 <button
 key={tb.key}
 role="tab"
 aria-selected={tab === tb.key}
 onClick={() => setTab(tb.key)}
 className={cn(
 "flex flex-1 min-w-[120px] items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all",
 tab === tb.key
 ? "bg-paper-2 text-success-fg shadow-sm "
 : "text-text-muted hover:text-ink-700 "
 )}
 >
 {tb.icon}
 {tb.label}
 </button>
 ))}
 </div>

 {/* Tab Panels */}
 {tab === "achievements" && (
 <AchievementsTab badges={badges} streak={streak} leaderboard={leaderboard} />
 )}
 {tab === "certificates" && (
 <CertificatesTab certificates={certificates} />
 )}
 {tab === "skills" && (
 <SkillsTab skills={skills} radarData={radarData} />
 )}
 {tab === "room" && <RoomTab />}
 {tab === "avatar" && <AvatarTab />}
 </div>
 );
}

/* ── Room Tab (freeform editor) ── */
function RoomTab() {
 const { t } = useTranslation();
 const { data: state, isLoading, isError } = useRoomState();

 if (isLoading) {
 return (
 <div className="grid min-h-[60vh] place-items-center text-sm text-text-muted">
 {t("room.loading")}
 </div>
 );
 }

 if (isError || !state) {
 return (
 <div className="grid min-h-[60vh] place-items-center text-sm text-coral-700">
 {t("room.error")}
 </div>
 );
 }

 return <RoomEditor state={state} />;
}

/* ── Avatar Tab ── */
function AvatarTab() {
 const { t } = useTranslation();
 const { data: state, isLoading, isError } = useRoomState();

 if (isLoading) {
 return (
 <div className="grid min-h-[60vh] place-items-center text-sm text-text-muted">
 {t("room.loading")}
 </div>
 );
 }

 if (isError || !state) {
 return (
 <div className="grid min-h-[60vh] place-items-center text-sm text-coral-700">
 {t("room.error")}
 </div>
 );
 }

 return (
 <div className="grid h-[calc(100vh-12rem)] grid-cols-1 gap-0 lg:grid-cols-[1fr_380px]">
 <div className="relative h-[60vh] min-h-[400px] overflow-hidden lg:h-full">
 <AvatarCanvas state={state} />
 <div className="pointer-events-none absolute left-6 top-6 max-w-md">
 <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-gray-500">
 {t("nav.achievements")} · {t("nav.myAvatar")}
 </p>
 <h1 className="mt-2 text-[26px] font-extrabold leading-tight text-ink-700">
 {t("avatar.welcomePrefix")}{" "}
 <span
 className="inline-block rounded-[6px] px-2 py-0 text-ink-900"
 style={{
 background: "#ffe9a3",
 transform: "rotate(-1.5deg)",
 display: "inline-block",
 }}
 >
 {t("avatar.welcomeHighlight")}
 </span>
 </h1>
 </div>
 </div>
 <aside className="overflow-y-auto border-t border-ink-100 bg-paper-2 lg:border-l lg:border-t-0">
 <AvatarBuilderPanel state={state} />
 </aside>
 </div>
 );
}

/* ── Achievements Tab ── */
function AchievementsTab({
 badges,
 streak,
 leaderboard,
}: {
 badges: BadgeData[];
 streak: StreakData | null;
 leaderboard: LeaderboardEntry[];
}) {
 const earnedCount = badges.filter((b) => b.earned).length;
 const league = streak?.league;

 return (
 <>
 {/* XP & League Card */}
 {league && (
 <Card className="mb-6 overflow-hidden">
 <CardContent className="p-0">
 <div className="flex flex-col sm:flex-row">
 <div className="flex items-center gap-4 p-6" style={{ background: `${league.color}15` }}>
 <LeagueMark kind={leagueKindFromName(league.name)} size={56} />
 <div>
 <p className="text-xs font-medium uppercase tracking-wider text-text-muted ">Current League</p>
 <p className="text-2xl font-bold" style={{ color: league.color === "#FFD700" ? "#B8860B" : league.color === "#C0C0C0" ? "#6B7280" : league.color }}>
 {league.name}
 </p>
 </div>
 </div>
 <div className="flex flex-1 items-center gap-6 p-6">
 <div className="flex items-center gap-2">
 <Star className="h-5 w-5 text-warning-fg" />
 <div>
 <p className="text-xs text-text-muted ">Total XP</p>
 <p className="text-xl font-bold text-text ">{streak?.total_xp || 0}</p>
 </div>
 </div>
 {league.next_league && (
 <div className="flex-1">
 <div className="mb-1 flex items-center justify-between text-xs text-text-muted ">
 <span>Progress to {league.next_league}</span>
 <span>{streak?.total_xp || 0} / {league.next_xp} XP</span>
 </div>
 <div className="h-3 w-full overflow-hidden rounded-pill bg-ink-100 " role="progressbar" aria-valuenow={Math.min(league.progress, 100)} aria-valuemin={0} aria-valuemax={100}>
 <div
 className="h-full rounded-pill transition-all duration-500"
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
 <div className="rounded-lg bg-sun-100 p-3 ">
 <Zap className="h-5 w-5 text-warning-fg" />
 </div>
 <div>
 <p className="text-xs font-medium text-text-muted ">Total XP</p>
 <p className="text-2xl font-bold text-text ">{streak?.total_xp || 0}</p>
 </div>
 </CardContent>
 </Card>

 <Card className="border-l-4 border-l-orange-400 hover:shadow-md">
 <CardContent className="flex items-center gap-4 p-6">
 <div className="rounded-lg bg-coral-300 p-3 ">
 <Flame className="h-5 w-5 text-coral-700" />
 </div>
 <div>
 <p className="text-xs font-medium text-text-muted ">Current Streak</p>
 <p className="text-2xl font-bold text-text ">{streak?.current_streak || 0} days</p>
 </div>
 </CardContent>
 </Card>

 <Card className="border-l-4 border-l-amber-400 hover:shadow-md">
 <CardContent className="flex items-center gap-4 p-6">
 <div className="rounded-lg bg-sun-100 p-3 ">
 <Trophy className="h-5 w-5 text-warning-fg" />
 </div>
 <div>
 <p className="text-xs font-medium text-text-muted ">Badges Earned</p>
 <p className="text-2xl font-bold text-text ">{earnedCount} / {badges.length}</p>
 </div>
 </CardContent>
 </Card>

 <Card className="border-l-4 border-l-green-400 hover:shadow-md">
 <CardContent className="flex items-center gap-4 p-6">
 <div className="rounded-lg bg-primary-soft p-3 ">
 <TrendingUp className="h-5 w-5 text-primary" />
 </div>
 <div>
 <p className="text-xs font-medium text-text-muted ">Longest Streak</p>
 <p className="text-2xl font-bold text-text ">{streak?.longest_streak || 0} days</p>
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
 <Trophy className="h-4 w-4 text-warning-fg" />
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
 criteriaKey={badge.criteria_key}
 earned={badge.earned}
 earnedAt={badge.earned_at}
 />
 ))}
 </div>
 {badges.length === 0 && (
 <p className="py-8 text-center text-sm text-text-muted">No badges available yet</p>
 )}
 </CardContent>
 </Card>
 </div>

 {/* Leaderboard */}
 <div>
 <Card>
 <CardHeader>
 <CardTitle className="flex items-center gap-2 text-base">
 <Medal className="h-4 w-4 text-primary" />
 Leaderboard
 </CardTitle>
 </CardHeader>
 <CardContent>
 {leaderboard.length === 0 ? (
 <p className="py-8 text-center text-sm text-text-muted">No students yet</p>
 ) : (
 <div className="space-y-2">
 {leaderboard.map((entry, i) => (
 <div key={entry.user_id} className="flex items-center gap-3 rounded-lg bg-surface-2 px-3 py-2 ">
 <span className={`flex h-6 w-6 items-center justify-center rounded-pill text-xs font-bold ${
 i === 0 ? "bg-sun-100 text-warning-fg "
 : i === 1 ? "bg-ink-200 text-text-muted "
 : i === 2 ? "bg-coral-300 text-coral-700 "
 : "bg-ink-100 text-text-subtle "
 }`}>
 {i + 1}
 </span>
 <div className="min-w-0 flex-1">
 <div className="flex items-center gap-1.5">
 <p className="truncate text-sm font-medium text-ink-700 ">{entry.user_name}</p>
 {entry.league && (
 <LeagueMark
 kind={leagueKindFromName(entry.league.name)}
 size={14}
 className="inline-block align-middle"
 />
 )}
 </div>
 <p className="text-xs text-text-muted ">
 {entry.total_xp} XP · {entry.completed_lessons} lessons · {entry.badge_count} badges
 </p>
 </div>
 {entry.current_streak > 0 && (
 <span className="flex items-center gap-0.5 text-xs font-medium text-coral-700">
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
 <Star className="h-4 w-4 text-warning-fg" />
 How to Earn XP
 </CardTitle>
 </CardHeader>
 <CardContent>
 <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
 <div className="rounded-lg bg-info-soft p-4 text-center ">
 <p className="text-2xl font-bold text-info-fg">+10</p>
 <p className="mt-1 text-xs text-info-fg">Complete a lesson</p>
 </div>
 <div className="rounded-lg bg-success-soft p-4 text-center ">
 <p className="text-2xl font-bold text-primary">+25</p>
 <p className="mt-1 text-xs text-primary">Pass a quiz</p>
 </div>
 <div className="rounded-lg bg-success-soft p-4 text-center ">
 <p className="text-2xl font-bold text-primary">+50</p>
 <p className="mt-1 text-xs text-primary">Pass a code challenge</p>
 </div>
 <div className="rounded-lg bg-coral-50 p-4 text-center ">
 <p className="text-2xl font-bold text-coral-700">+5</p>
 <p className="mt-1 text-xs text-coral-700">Daily streak bonus</p>
 </div>
 </div>
 </CardContent>
 </Card>
 </>
 );
}

/* ── Certificates Tab ── */
function CertificatesTab({ certificates }: { certificates: CertificateData[] }) {
 return (
 <>
 {certificates.length === 0 ? (
 <Card>
 <CardContent className="flex flex-col items-center justify-center py-16">
 <div className="mb-4 rounded-pill bg-ink-100 p-4 ">
 <Award className="h-8 w-8 text-text-subtle" />
 </div>
 <h3 className="text-lg font-semibold text-text-muted ">No certificates yet</h3>
 <p className="mt-1 text-sm text-text-subtle ">
 Complete a course to earn your first certificate!
 </p>
 </CardContent>
 </Card>
 ) : (
 <div className="space-y-4">
 {certificates.map((cert) => (
 <Card key={cert.id} className="hover:shadow-md">
 <CardContent className="flex items-center gap-4 p-5">
 <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-amber-100 to-amber-50">
 <Award className="h-6 w-6 text-warning-fg" />
 </div>
 <div className="min-w-0 flex-1">
 <h3 className="text-sm font-semibold text-ink-700 ">
 {cert.course_title}
 </h3>
 <p className="text-xs text-text-subtle ">
 Certificate #{cert.certificate_number} · Issued{" "}
 {new Date(cert.issued_at).toLocaleDateString()}
 </p>
 </div>
 <button
 onClick={async () => {
   try {
     const { data } = await apiClient.get(`/certificates/${cert.id}/download`, { responseType: "text" });
     const w = window.open("", "_blank");
     if (w) { w.document.write(data); w.document.close(); }
   } catch { /* toast handled by interceptor */ }
 }}
 className="flex items-center gap-1.5 rounded-lg border border-primary-soft bg-success-soft px-3 py-2 text-xs font-medium text-success-fg hover:bg-primary-soft cursor-pointer"
 >
 <Download className="h-3.5 w-3.5" />
 View
 </button>
 </CardContent>
 </Card>
 ))}
 </div>
 )}
 </>
 );
}

/* ── Skills Tab ── */
function SkillsTab({ skills, radarData }: { skills: UserSkill[]; radarData: RadarPoint[] }) {
 const { t } = useTranslation();
 const categories = [...new Set(skills.map((s) => s.category))];

 return (
 <>
 {skills.length === 0 ? (
 <Card>
 <CardContent className="flex flex-col items-center py-12 text-center">
 <div className="mb-3 rounded-pill bg-ink-100 p-3 ">
 <Zap className="h-6 w-6 text-text-subtle" />
 </div>
 <p className="text-sm font-medium text-text-muted">{t("skills.noSkills") || "No skills earned yet"}</p>
 <p className="mt-1 text-xs text-text-subtle">{t("skills.noSkillsHint") || "Complete lessons to start earning skills"}</p>
 </CardContent>
 </Card>
 ) : (
 <div className="space-y-6">
 {/* Radar Chart */}
 {radarData.length >= 3 && (
 <Card>
 <CardHeader>
 <CardTitle>{t("skills.radar") || "Skills Radar"}</CardTitle>
 </CardHeader>
 <CardContent>
 <ResponsiveContainer width="100%" height={300}>
 <RadarChart data={radarData}>
 <PolarGrid stroke="#e2e8f0" />
 <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12, fill: "#64748b" }} />
 <PolarRadiusAxis tick={{ fontSize: 10, fill: "#94a3b8" }} />
 <Radar name="XP" dataKey="value" stroke="#6366f1" fill="#6366f1" fillOpacity={0.3} />
 </RadarChart>
 </ResponsiveContainer>
 </CardContent>
 </Card>
 )}

 {/* Skills by category */}
 {categories.map((cat) => (
 <div key={cat}>
 <h2 className="mb-3 text-lg font-semibold capitalize text-text ">{cat}</h2>
 <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
 {skills
 .filter((s) => s.category === cat)
 .map((s) => {
 const progressToNext = ((s.total_xp % 50) / 50) * 100;
 return (
 <Card key={s.skill_id} className="border-l-4 border-l-green-400">
 <CardContent className="p-4">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2">
 <span className={`rounded-lg p-1.5 text-xs ${CATEGORY_COLORS[cat] || "bg-ink-100 text-text-muted"}`}>
 {s.skill_icon || "⚡"}
 </span>
 <span className="font-medium text-ink-700 ">{s.skill_name}</span>
 </div>
 <span className="rounded-pill bg-primary-soft px-2 py-0.5 text-xs font-bold text-success-fg ">
 {t("skills.level") || "Lv."}{s.level}
 </span>
 </div>
 <div className="mt-3">
 <div className="mb-1 flex justify-between text-xs text-text-subtle">
 <span>{s.total_xp} XP</span>
 <span>Next: {(Math.floor(s.total_xp / 50) + 1) * 50} XP</span>
 </div>
 <div className="h-1.5 overflow-hidden rounded-pill bg-ink-100 " role="progressbar" aria-valuenow={progressToNext} aria-valuemin={0} aria-valuemax={100}>
 <div className="h-full rounded-pill bg-primary" style={{ width: `${progressToNext}%` }} />
 </div>
 </div>
 </CardContent>
 </Card>
 );
 })}
 </div>
 </div>
 ))}
 </div>
 )}
 </>
 );
}
