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
  math: "text-green-600 bg-green-100 dark:bg-green-500/20 dark:text-green-400",
  language: "text-green-600 bg-green-100 dark:bg-green-500/20 dark:text-green-400",
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
        <h1 className="text-2xl font-bold text-ink-900 dark:text-ink-100">{t("skills.title")}</h1>
        <p className="text-base text-ink-500 dark:text-ink-400">{t("skills.subtitle")}</p>
      </div>

      {skills.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12 text-center">
            <div className="mb-3 rounded-full bg-ink-100 p-3 dark:bg-white/10">
              <Zap className="h-6 w-6 text-ink-400" />
            </div>
            <p className="text-sm font-medium text-ink-500">{t("skills.noSkills")}</p>
            <p className="mt-1 text-xs text-ink-400">{t("skills.noSkillsHint")}</p>
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
                    <PolarGrid stroke="#e6e8e4" />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12, fill: "#4d5a51" }} />
                    <PolarRadiusAxis tick={{ fontSize: 10, fill: "#9aa39d" }} />
                    <Radar
                      name="XP"
                      dataKey="value"
                      stroke="#0a8754"
                      fill="#0a8754"
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
              <h2 className="mb-3 text-lg font-semibold capitalize text-ink-900 dark:text-ink-100">{cat}</h2>
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
                              <span className={`rounded-lg p-1.5 text-xs ${CATEGORY_COLORS[cat] || "bg-ink-100 text-ink-700"}`}>
                                {s.skill_icon || "⚡"}
                              </span>
                              <span className="font-medium text-ink-900 dark:text-ink-200">{s.skill_name}</span>
                            </div>
                            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-bold text-green-700 dark:bg-green-500/20 dark:text-green-300">
                              {t("skills.level")}{s.level}
                            </span>
                          </div>
                          <div className="mt-3">
                            <div className="mb-1 flex justify-between text-xs text-ink-400">
                              <span>{s.total_xp} XP</span>
                              <span>Next: {(Math.floor(s.total_xp / 50) + 1) * 50} XP</span>
                            </div>
                            <div className="h-1.5 overflow-hidden rounded-full bg-ink-100 dark:bg-white/10">
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
