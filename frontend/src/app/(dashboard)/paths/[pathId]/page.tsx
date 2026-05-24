"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import apiClient from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle, Lock, BookOpen, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n/context";

interface PathStep {
 id: string;
 course_id: string;
 course_title: string;
 sort_order: number;
 is_required: boolean;
 completed: boolean;
}

interface PathDetail {
 id: string;
 title: string;
 description: string;
 is_published: boolean;
 enrolled: boolean;
 current_step: number;
 steps: PathStep[];
}

export default function PathDetailPage() {
 const { t } = useTranslation();
 const params = useParams();
 const pathId = params.pathId as string;
 const [path, setPath] = useState<PathDetail | null>(null);
 const [loading, setLoading] = useState(true);

 useEffect(() => {
 apiClient
 .get(`/learning-paths/${pathId}`)
 .then(({ data }) => setPath(data))
 .catch(() => {})
 .finally(() => setLoading(false));
 }, [pathId]);

 const handleEnroll = async () => {
 try {
 await apiClient.post(`/learning-paths/${pathId}/enroll`);
 toast.success(t("paths.enrollSuccess"));
 const { data } = await apiClient.get(`/learning-paths/${pathId}`);
 setPath(data);
 } catch {
 toast.error(t("paths.enrollFailed"));
 }
 };

 if (loading) {
 return (
 <div className="flex h-64 items-center justify-center">
 <div className="h-8 w-8 animate-spin rounded-pill border-4 border-primary border-t-transparent" />
 </div>
 );
 }

 if (!path) {
 return (
 <div className="mx-auto max-w-3xl text-center">
 <p className="text-text-muted ">{t("paths.notFound")}</p>
 <Link href="/paths" className="mt-2 inline-flex items-center gap-1 text-sm text-primary hover:text-success-fg">
 <ArrowLeft className="h-3 w-3" /> {t("paths.backToPaths")}
 </Link>
 </div>
 );
 }

 const completedCount = path.steps.filter((s) => s.completed).length;
 const progress = path.steps.length > 0 ? Math.round((completedCount / path.steps.length) * 100) : 0;

 return (
 <div className="mx-auto max-w-3xl">
 <Link
 href="/paths"
 className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-text-muted hover:text-ink-700 "
 >
 <ArrowLeft className="h-4 w-4" /> {t("paths.backToLearningPaths")}
 </Link>

 <Card className="mb-6">
 <CardHeader>
 <CardTitle as="h1" className="text-xl">{path.title}</CardTitle>
 {path.description && (
 <p className="mt-1 text-sm text-text-muted ">{path.description}</p>
 )}
 </CardHeader>
 <CardContent>
 <div className="flex items-center gap-4">
 <div className="flex-1">
 <div className="h-3 rounded-pill bg-ink-200 ">
 <div
 className="h-3 rounded-pill bg-primary transition-all"
 style={{ width: `${progress}%` }}
 />
 </div>
 </div>
 <span className="text-sm font-medium text-text-muted ">
 {t("paths.completedCount").replace("{done}", String(completedCount)).replace("{total}", String(path.steps.length))}
 </span>
 </div>
 {!path.enrolled && (
 <Button className="mt-4" onClick={handleEnroll}>
 {t("paths.enrollInPath")}
 </Button>
 )}
 </CardContent>
 </Card>

 {/* Steps timeline */}
 <div className="space-y-0">
 {path.steps.map((step, idx) => {
 const isUnlocked = idx === 0 || path.steps[idx - 1].completed || !step.is_required;
 const isCurrent = path.enrolled && !step.completed && isUnlocked;

 return (
 <div key={step.id} className="relative flex gap-4">
 {/* Timeline line */}
 <div className="flex flex-col items-center">
 <div className={`flex h-10 w-10 items-center justify-center rounded-pill border-2 ${
 step.completed
 ? "border-primary bg-primary-soft "
 : isCurrent
 ? "border-primary bg-primary-soft "
 : "border-ink-300 bg-ink-100 "
 }`}>
 {step.completed ? (
 <CheckCircle className="h-5 w-5 text-primary " />
 ) : isUnlocked ? (
 <BookOpen className={`h-5 w-5 ${isCurrent ? "text-primary " : "text-text-subtle"}`} />
 ) : (
 <Lock className="h-4 w-4 text-text-subtle " />
 )}
 </div>
 {idx < path.steps.length - 1 && (
 <div className={`w-0.5 flex-1 min-h-[24px] ${
 step.completed ? "bg-primary " : "bg-ink-200 "
 }`} />
 )}
 </div>

 {/* Step card */}
 <div className="mb-4 flex-1 pb-2">
 <Card className={`${
 isCurrent ? "border-primary shadow-sm " : ""
 } ${step.completed ? "opacity-75" : ""}`}>
 <CardContent className="flex items-center justify-between p-4">
 <div>
 <div className="flex items-center gap-2">
 <h3 className="text-sm font-semibold text-text ">
 {step.course_title}
 </h3>
 {!step.is_required && (
 <span className="rounded-pill bg-ink-100 px-2 py-0.5 text-[10px] text-text-muted ">
 {t("common.optional")}
 </span>
 )}
 </div>
 <p className="text-xs text-text-muted ">
 {t("paths.stepNum").replace("{n}", String(idx + 1))}
 {step.completed && t("paths.stepCompletedSuffix")}
 </p>
 </div>
 {isUnlocked && !step.completed && (
 <Link href={`/courses/${step.course_id}`}>
 <Button size="sm" variant={isCurrent ? "default" : "outline"}>
 {isCurrent ? t("paths.start") : t("paths.view")} <ArrowRight className="ml-1 h-3 w-3" />
 </Button>
 </Link>
 )}
 {step.completed && (
 <Link href={`/courses/${step.course_id}`}>
 <Button size="sm" variant="ghost">
 {t("paths.review")} <ArrowRight className="ml-1 h-3 w-3" />
 </Button>
 </Link>
 )}
 </CardContent>
 </Card>
 </div>
 </div>
 );
 })}
 </div>
 </div>
 );
}
