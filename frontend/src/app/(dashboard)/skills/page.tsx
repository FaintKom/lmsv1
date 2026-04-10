"use client";

import { useEffect, useState } from "react";
import apiClient from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Zap } from "lucide-react";
import { useTranslation } from "@/lib/i18n/context";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from "recharts";

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
  language: "text-violet-600 bg-violet-100 dark:bg-violet-500/20 dark:text-violet-400",
};

export default function SkillsPage() {
  const [skills, setSkills] = useState<UserSkill[]>([]);
  const [radarData, setRadarData] = useState<RadarPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();

  useEffect(() => {
    Promise.all([
      apiClient.get("/skills/my").then(({ data }) => data),
      apiClient.get("/skills/radar").then(({ data }) => data),
    ])
      .then(([s, r]) => { setSkills(s); setRadarData(r); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex h-96 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-green-500" /></div>;
  }

  const categories = [...new Set(skills.map((s) => s.category))];

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{t("skills.title")}</h1>
        <p className="text-base text-slate-500 dark:text-slate-400">{t("skills.subtitle")}</p>
      </div>

      {skills.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12 text-center">
            <div className="mb-3 rounded-full bg-slate-100 p-3 dark:bg-white/10">
              <Zap className="h-6 w-6 text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-500">{t("skills.noSkills")}</p>
            <p className="mt-1 text-xs text-slate-400">{t("skills.noSkillsHint")}</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Radar Chart */}
          {radarData.length >= 3 && (
            <Card>
              <CardHeader>
                <CardTitle>{t("skills.radar")}</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12, fill: "#64748b" }} />
                    <PolarRadiusAxis tick={{ fontSize: 10, fill: "#94a3b8" }} />
                    <Radar
                      name="XP"
                      dataKey="value"
                      stroke="#6366f1"
                      fill="#6366f1"
                      fillOpacity={0.3}
                    />
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
                              {t("skills.level")}{s.level}
                            </span>
                          </div>
                          <div className="mt-3">
                            <div className="mb-1 flex justify-between text-xs text-slate-400">
                              <span>{s.total_xp} XP</span>
                              <span>Next: {(Math.floor(s.total_xp / 50) + 1) * 50} XP</span>
                            </div>
                            <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
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
        </>
      )}
    </div>
  );
}
