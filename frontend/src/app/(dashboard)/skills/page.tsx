"use client";

import { useEffect, useState } from "react";
import apiClient from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Zap } from "lucide-react";
import { useTranslation } from "@/lib/i18n/context";
import { PageHeader } from "@/components/ui/page-kit";
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
 programming: "text-info-fg bg-info-soft ",
 math: "text-primary bg-primary-soft ",
 language: "text-primary bg-primary-soft ",
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
 return <div className="flex h-96 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
 }

 const categories = [...new Set(skills.map((s) => s.category))];

 return (
 <div className="space-y-8">
 <PageHeader title={t("skills.title")} description={t("skills.subtitle")} />

 {skills.length === 0 ? (
 <Card>
 <CardContent className="flex flex-col items-center py-12 text-center">
 <div className="mb-3 rounded-pill bg-surface-2 p-3 ">
 <Zap className="h-6 w-6 text-text-subtle" />
 </div>
 <p className="text-sm font-medium text-text-muted">{t("skills.noSkills")}</p>
 <p className="mt-1 text-xs text-text-subtle">{t("skills.noSkillsHint")}</p>
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
 <PolarGrid stroke="var(--color-border)" />
 <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12, fill: "var(--color-text-muted)" }} />
 <PolarRadiusAxis tick={{ fontSize: 10, fill: "var(--color-text-subtle)" }} />
 <Radar
 name="XP"
 dataKey="value"
 stroke="var(--viz-1)"
 fill="var(--viz-1)"
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
 {t("skills.level")}{s.level}
 </span>
 </div>
 <div className="mt-3">
 <div className="mb-1 flex justify-between text-xs text-text-subtle">
 <span>{s.total_xp} XP</span>
 <span>Next: {(Math.floor(s.total_xp / 50) + 1) * 50} XP</span>
 </div>
 <div className="h-1.5 overflow-hidden rounded-pill bg-surface-2 ">
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
 </>
 )}
 </div>
 );
}
