"use client";

import { ProgressBar } from "@/components/ui/progress-bar";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import apiClient from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BadgeCard } from "@/components/gamification/badge-card";
import { LEAGUE_TINT, LeagueMark, leagueKindFromName } from "@/components/gamification/league-mark";
import { useTranslation } from "@/lib/i18n/context";
import {
 Trophy, Flame, Zap, TrendingUp,
 Award, Download, Home, UserCircle,
} from "lucide-react";
import { EmptyState, PageHeader, PageLoading, StatTile, Tabs, type TabItem } from "@/components/ui/page-kit";
import {
 RadarChart,
 PolarGrid,
 PolarAngleAxis,
 PolarRadiusAxis,
 Radar,
 ResponsiveContainer,
} from "recharts";
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

 if (loading) return <PageLoading />;

 const tabs: TabItem[] = [
 { value: "achievements", label: t("nav.achievements"), icon: Trophy },
 { value: "certificates", label: t("nav.certificates"), icon: Award },
 { value: "skills", label: t("nav.skills"), icon: Zap },
 { value: "room", label: t("nav.myRoom"), icon: Home },
 { value: "avatar", label: t("nav.myAvatar"), icon: UserCircle },
 ];

 return (
 <div className="grid gap-8">
 <div className="grid gap-6">
 <PageHeader title={t("nav.achievements")} description={t("achieve.subtitle")} />
 <Tabs
 aria-label={t("nav.achievements")}
 items={tabs}
 value={tab}
 onChange={(v) => setTab(v as Tab)}
 />
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
 <div className="grid min-h-[60vh] place-items-center text-sm text-clay-700">
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
 <div className="grid min-h-[60vh] place-items-center text-sm text-clay-700">
 {t("room.error")}
 </div>
 );
 }

 return (
 <div className="grid grid-cols-1 gap-0 lg:h-[calc(100vh-12rem)] lg:grid-cols-[1fr_380px]">
 <div className="relative h-[60vh] min-h-[400px] overflow-hidden lg:h-full">
 <AvatarCanvas state={state} />
 <div className="pointer-events-none absolute left-6 top-6 max-w-md">
 <p className="text-xs text-text-subtle">
 {t("nav.achievements")} · {t("nav.myAvatar")}
 </p>
 <h1 className="mt-2 text-xl font-extrabold leading-tight text-text">
 {t("avatar.welcomePrefix")}{" "}
 <span
 className="inline-block rounded-xs px-2 py-0 text-text"
 style={{
 background: "var(--color-reward-soft)",
 transform: "rotate(-1.5deg)",
 display: "inline-block",
 }}
 >
 {t("avatar.welcomeHighlight")}
 </span>
 </h1>
 </div>
 </div>
 <aside className="overflow-y-auto border-t border-border bg-surface lg:border-l lg:border-t-0">
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
 const { t } = useTranslation();
 const earnedCount = badges.filter((b) => b.earned).length;
 const league = streak?.league;

 return (
 <>
 {/* XP & League Card */}
 {league && (
 <Card className="mb-6 overflow-hidden">
 <CardContent className="p-0">
 <div className="flex flex-col sm:flex-row">
 <div
 className="flex items-center gap-4 p-6"
 style={{ background: `color-mix(in srgb, ${LEAGUE_TINT[leagueKindFromName(league.name)]} 8%, transparent)` }}
 >
 <LeagueMark kind={leagueKindFromName(league.name)} size={56} />
 <div>
 <p className="text-sm text-text-muted">{t("achieve.currentLeague")}</p>
 {/* The medal beside it carries the league; the name is text, so it
 wears a text token. It used to be painted in the API's hex, with
 two hardcoded darkening branches for gold and silver. */}
 <p className="text-2xl font-bold text-text">{league.name}</p>
 </div>
 </div>
 {/* Total XP lives in the tiles below; this side is only the way up. */}
 <div className="flex flex-1 items-center gap-6 p-6">
 {league.next_league && (
 <div className="flex-1">
 <div className="mb-1 flex items-center justify-between text-sm text-text-muted">
 <span>{t("achieve.progressTo").replace("{league}", league.next_league)}</span>
 <span className="tabular-nums">{streak?.total_xp || 0} / {league.next_xp} XP</span>
 </div>
 <ProgressBar
 value={league.progress}
 size="lg"
 fillClassName=""
 fillStyle={{ background: LEAGUE_TINT[leagueKindFromName(league.name)] }}
 />
 </div>
 )}
 </div>
 </div>
 </CardContent>
 </Card>
 )}

 {/* The figures, in the one tile every screen uses (specs/075 FR-005) */}
 <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
 <StatTile icon={Zap} label={t("achieve.totalXp")} value={streak?.total_xp || 0} />
 <StatTile
 icon={Flame}
 label={t("achieve.streak")}
 value={`${streak?.current_streak || 0} ${t("achieve.days")}`}
 />
 <StatTile icon={Trophy} label={t("achieve.badgesEarned")} value={`${earnedCount} / ${badges.length}`} />
 <StatTile
 icon={TrendingUp}
 label={t("achieve.longest")}
 value={`${streak?.longest_streak || 0} ${t("achieve.days")}`}
 />
 </div>

 <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
 {/* Badges */}
 <div className="lg:col-span-2">
 <Card>
 <CardHeader>
 <CardTitle className="flex items-center gap-2 text-base">
 {t("achieve.allBadges")}
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
 <p className="py-8 text-center text-sm text-text-muted">{t("achieve.noBadges")}</p>
 )}
 </CardContent>
 </Card>
 </div>

 {/* Leaderboard */}
 <div>
 <Card>
 <CardHeader>
 <CardTitle className="flex items-center gap-2 text-base">
 {t("achieve.leaderboard")}
 </CardTitle>
 </CardHeader>
 <CardContent>
 {leaderboard.length === 0 ? (
 <p className="py-8 text-center text-sm text-text-muted">{t("achieve.noStudents")}</p>
 ) : (
 <div className="space-y-2">
 {leaderboard.map((entry, i) => (
 <div key={entry.user_id} className="flex items-center gap-3 rounded-lg bg-surface-2 px-3 py-2 ">
 <span className={`flex h-6 w-6 items-center justify-center rounded-pill text-xs font-bold ${
 // ink-200 and clay-300 are raw scale values: they stay light in dark
 // mode while the semantic text colours flip with it, which left silver
 // at 1.52:1 and bronze at 4.09:1. Ink on a fixed light chip reads in
 // both themes.
 i === 0 ? "bg-warning-soft text-warning-fg "
 : i === 1 ? "bg-ink-200 text-ink-900 "
 : i === 2 ? "bg-clay-300 text-ink-900 "
 : "bg-surface-2 text-text-subtle "
 }`}>
 {i + 1}
 </span>
 <div className="min-w-0 flex-1">
 <div className="flex items-center gap-1.5">
 <p className="truncate text-sm font-medium text-text ">{entry.user_name}</p>
 {entry.league && (
 <LeagueMark
 kind={leagueKindFromName(entry.league.name)}
 size={14}
 className="inline-block align-middle"
 />
 )}
 </div>
 <p className="text-xs text-text-muted ">
 {t("achieve.statsLine")
 .replace("{xp}", String(entry.total_xp))
 .replace("{lessons}", String(entry.completed_lessons))
 .replace("{badges}", String(entry.badge_count))}
 </p>
 </div>
 {/* text-danger-fg, not text-clay-700: the raw value stays dark in dark
     mode and sat at 1.93:1 on surface-2. The token flips with the theme. */}
 {entry.current_streak > 0 && (
 <span className="flex items-center gap-0.5 text-xs font-medium text-danger-fg">
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
 <CardTitle className="text-base">{t("achieve.howToEarn")}</CardTitle>
 </CardHeader>
 <CardContent>
 {/* One quiet list of rates: four tinted boxes made a rule look like an alert. */}
 <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
 {[
 ["+10", t("achieve.earnLesson")],
 ["+25", t("achieve.earnQuiz")],
 ["+50", t("achieve.earnCode")],
 ["+5", t("achieve.earnStreak")],
 ].map(([xp, label]) => (
 <div key={label} className="flex flex-col-reverse">
 <dt className="mt-0.5 text-sm text-text-muted">{label}</dt>
 <dd className="font-display text-xl font-bold tabular-nums text-text">{xp} XP</dd>
 </div>
 ))}
 </dl>
 </CardContent>
 </Card>
 </>
 );
}

/* ── Certificates Tab ── */
function CertificatesTab({ certificates }: { certificates: CertificateData[] }) {
 const { t } = useTranslation();
 return (
 <>
 {certificates.length === 0 ? (
 <EmptyState icon={Award} title={t("certs.noTitle")} description={t("certs.noCerts")} />
 ) : (
 <div className="space-y-4">
 {certificates.map((cert) => (
 <Card key={cert.id} className="hover:shadow-md">
 <CardContent className="flex items-center gap-4 p-5">
 <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-reward-soft">
 <Award className="h-6 w-6 text-warning-fg" />
 </div>
 <div className="min-w-0 flex-1">
 <h3 className="text-sm font-semibold text-text ">
 {cert.course_title}
 </h3>
 <p className="text-xs text-text-subtle ">
 {t("certs.certNumber")}{cert.certificate_number} · {t("certs.issued")}{" "}
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
 <Download className="h-3.5 w-3.5" aria-hidden="true" />
 {t("certs.view")}
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
 <EmptyState icon={Zap} title={t("skills.noSkills")} description={t("skills.noSkillsHint")} />
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
 <PolarGrid stroke="var(--color-border)" />
 <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12, fill: "var(--color-text-muted)" }} />
 <PolarRadiusAxis tick={{ fontSize: 10, fill: "var(--color-text-subtle)" }} />
 <Radar name="XP" dataKey="value" stroke="var(--viz-1)" fill="var(--viz-1)" fillOpacity={0.3} />
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
 <Card key={s.skill_id} className="">
 <CardContent className="p-4">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2">
 <span className={`rounded-lg p-1.5 text-xs ${CATEGORY_COLORS[cat] || "bg-surface-2 text-text-muted"}`}>
 {s.skill_icon || <Zap className="h-3.5 w-3.5" />}
 </span>
 <span className="font-medium text-text ">{s.skill_name}</span>
 </div>
 <span className="rounded-pill bg-primary-soft px-2 py-0.5 text-xs font-bold text-success-fg ">
 {t("skills.level") || "Lv."}{s.level}
 </span>
 </div>
 <div className="mt-3">
 <div className="mb-1 flex justify-between text-xs text-text-subtle">
 <span>{s.total_xp} XP</span>
 <span>{t("skills.nextLevel").replace("{xp}", String((Math.floor(s.total_xp / 50) + 1) * 50))}</span>
 </div>
 <ProgressBar value={progressToNext} size="sm" />
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
