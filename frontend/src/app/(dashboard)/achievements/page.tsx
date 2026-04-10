"use client";

import { useEffect, useState } from "react";
import apiClient from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BadgeCard } from "@/components/gamification/badge-card";
import { useTranslation } from "@/lib/i18n/context";
import {
  Trophy, Flame, Medal, Star, Zap, TrendingUp,
  Award, Download, Loader2,
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
  programming: "text-blue-600 bg-blue-100 dark:bg-blue-500/20 dark:text-blue-400",
  math: "text-emerald-600 bg-emerald-100 dark:bg-emerald-500/20 dark:text-emerald-400",
  language: "text-emerald-600 bg-emerald-100 dark:bg-emerald-500/20 dark:text-emerald-400",
};

type Tab = "achievements" | "certificates" | "skills";

/* ── Page ── */
export default function AchievementsPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>("achievements");
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
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-600 border-t-transparent" />
      </div>
    );
  }

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "achievements", label: t("nav.achievements") || "Achievements", icon: <Trophy className="h-4 w-4" /> },
    { key: "certificates", label: t("nav.certificates") || "Certificates", icon: <Award className="h-4 w-4" /> },
    { key: "skills", label: t("nav.skills") || "Skills", icon: <Zap className="h-4 w-4" /> },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          {t("nav.achievements") || "Achievements"}
        </h1>
        <p className="mt-1 text-base text-slate-500 dark:text-slate-400">
          Track your progress, earn XP, and climb the leagues
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-xl bg-slate-100 p-1 dark:bg-white/5" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all",
              tab === t.key
                ? "bg-white text-green-700 shadow-sm dark:bg-white/10 dark:text-green-300"
                : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            )}
          >
            {t.icon}
            {t.label}
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
                <span className="text-5xl">{league.icon}</span>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Current League</p>
                  <p className="text-2xl font-bold" style={{ color: league.color === "#FFD700" ? "#B8860B" : league.color === "#C0C0C0" ? "#6B7280" : league.color }}>
                    {league.name}
                  </p>
                </div>
              </div>
              <div className="flex flex-1 items-center gap-6 p-6">
                <div className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-yellow-500" />
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Total XP</p>
                    <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{streak?.total_xp || 0}</p>
                  </div>
                </div>
                {league.next_league && (
                  <div className="flex-1">
                    <div className="mb-1 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                      <span>Progress to {league.next_league}</span>
                      <span>{streak?.total_xp || 0} / {league.next_xp} XP</span>
                    </div>
                    <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/10" role="progressbar" aria-valuenow={Math.min(league.progress, 100)} aria-valuemin={0} aria-valuemax={100}>
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
            <div className="rounded-xl bg-yellow-100 p-3 dark:bg-yellow-500/20">
              <Zap className="h-5 w-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total XP</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{streak?.total_xp || 0}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-400 hover:shadow-md">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-xl bg-orange-100 p-3 dark:bg-orange-500/20">
              <Flame className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Current Streak</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{streak?.current_streak || 0} days</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-400 hover:shadow-md">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-xl bg-amber-100 p-3 dark:bg-amber-500/20">
              <Trophy className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Badges Earned</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{earnedCount} / {badges.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-400 hover:shadow-md">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-xl bg-green-100 p-3 dark:bg-green-500/20">
              <TrendingUp className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Longest Streak</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{streak?.longest_streak || 0} days</p>
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
                <p className="py-8 text-center text-sm text-slate-500">No badges available yet</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Leaderboard */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Medal className="h-4 w-4 text-green-500" />
                Leaderboard
              </CardTitle>
            </CardHeader>
            <CardContent>
              {leaderboard.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-500">No students yet</p>
              ) : (
                <div className="space-y-2">
                  {leaderboard.map((entry, i) => (
                    <div key={entry.user_id} className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2 dark:bg-white/5">
                      <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                        i === 0 ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20"
                          : i === 1 ? "bg-slate-200 text-slate-600 dark:bg-white/10"
                          : i === 2 ? "bg-orange-100 text-orange-600 dark:bg-orange-500/20"
                          : "bg-slate-100 text-slate-400 dark:bg-white/10"
                      }`}>
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-300">{entry.user_name}</p>
                          {entry.league && <span className="text-xs" title={entry.league.name}>{entry.league.icon}</span>}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {entry.total_xp} XP · {entry.completed_lessons} lessons · {entry.badge_count} badges
                        </p>
                      </div>
                      {entry.current_streak > 0 && (
                        <span className="flex items-center gap-0.5 text-xs font-medium text-orange-500">
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
            <div className="rounded-lg bg-blue-50 p-4 text-center dark:bg-blue-500/10">
              <p className="text-2xl font-bold text-blue-600">+10</p>
              <p className="mt-1 text-xs text-blue-500">Complete a lesson</p>
            </div>
            <div className="rounded-lg bg-emerald-50 p-4 text-center dark:bg-emerald-500/10">
              <p className="text-2xl font-bold text-emerald-600">+25</p>
              <p className="mt-1 text-xs text-emerald-500">Pass a quiz</p>
            </div>
            <div className="rounded-lg bg-emerald-50 p-4 text-center dark:bg-emerald-500/10">
              <p className="text-2xl font-bold text-emerald-600">+50</p>
              <p className="mt-1 text-xs text-emerald-500">Pass a code challenge</p>
            </div>
            <div className="rounded-lg bg-orange-50 p-4 text-center dark:bg-orange-500/10">
              <p className="text-2xl font-bold text-orange-600">+5</p>
              <p className="mt-1 text-xs text-orange-500">Daily streak bonus</p>
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
            <div className="mb-4 rounded-full bg-slate-100 p-4 dark:bg-white/10">
              <Award className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-600 dark:text-slate-300">No certificates yet</h3>
            <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">
              Complete a course to earn your first certificate!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {certificates.map((cert) => (
            <Card key={cert.id} className="hover:shadow-md">
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-100 to-amber-50">
                  <Award className="h-6 w-6 text-amber-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {cert.course_title}
                  </h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    Certificate #{cert.certificate_number} · Issued{" "}
                    {new Date(cert.issued_at).toLocaleDateString()}
                  </p>
                </div>
                <a
                  href={`/api/v1/certificates/${cert.id}/download`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs font-medium text-green-700 hover:bg-green-100 dark:border-green-500/30 dark:bg-green-500/20 dark:text-green-300 dark:hover:bg-green-500/30"
                >
                  <Download className="h-3.5 w-3.5" />
                  View
                </a>
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
            <div className="mb-3 rounded-full bg-slate-100 p-3 dark:bg-white/10">
              <Zap className="h-6 w-6 text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-500">{t("skills.noSkills") || "No skills earned yet"}</p>
            <p className="mt-1 text-xs text-slate-400">{t("skills.noSkillsHint") || "Complete lessons to start earning skills"}</p>
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
              <h2 className="mb-3 text-lg font-semibold capitalize text-slate-900 dark:text-slate-100">{cat}</h2>
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
                              <span className={`rounded-lg p-1.5 text-xs ${CATEGORY_COLORS[cat] || "bg-slate-100 text-slate-600"}`}>
                                {s.skill_icon || "⚡"}
                              </span>
                              <span className="font-medium text-slate-800 dark:text-slate-200">{s.skill_name}</span>
                            </div>
                            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-bold text-green-700 dark:bg-green-500/20 dark:text-green-300">
                              {t("skills.level") || "Lv."}{s.level}
                            </span>
                          </div>
                          <div className="mt-3">
                            <div className="mb-1 flex justify-between text-xs text-slate-400">
                              <span>{s.total_xp} XP</span>
                              <span>Next: {(Math.floor(s.total_xp / 50) + 1) * 50} XP</span>
                            </div>
                            <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10" role="progressbar" aria-valuenow={progressToNext} aria-valuemin={0} aria-valuemax={100}>
                              <div className="h-full rounded-full bg-green-500" style={{ width: `${progressToNext}%` }} />
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
