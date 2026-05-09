"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
 BookOpen,
 Users,
 UserPlus,
 CheckCircle,
 ArrowRight,
 X,
 Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import apiClient from "@/lib/api-client";

interface OnboardingStep {
 id: string;
 title: string;
 description: string;
 icon: React.ReactNode;
 href: string;
 cta: string;
 check: () => Promise<boolean>;
}

export function TeacherOnboarding() {
 const [dismissed, setDismissed] = useState(false);
 const [completed, setCompleted] = useState<Record<string, boolean>>({});
 const [loading, setLoading] = useState(true);

 const steps: OnboardingStep[] = [
 {
 id: "course",
 title: "Create your first course",
 description: "Set up a course with lessons, exercises, and materials for your students.",
 icon: <BookOpen className="h-5 w-5" />,
 href: "/admin/courses",
 cta: "Create Course",
 check: async () => {
 try {
 const { data } = await apiClient.get("/courses/?per_page=1");
 return (data.items?.length || 0) > 0;
 } catch { return false; }
 },
 },
 {
 id: "group",
 title: "Create a student group",
 description: "Organize students into classes or groups for easier management.",
 icon: <Users className="h-5 w-5" />,
 href: "/admin/groups",
 cta: "Create Group",
 check: async () => {
 try {
 const { data } = await apiClient.get("/groups/?per_page=1");
 return (data.items?.length || 0) > 0;
 } catch { return false; }
 },
 },
 {
 id: "student",
 title: "Invite your first student",
 description: "Share an invite link or add students manually to get started.",
 icon: <UserPlus className="h-5 w-5" />,
 href: "/admin/users",
 cta: "Manage Users",
 check: async () => {
 try {
 const { data } = await apiClient.get("/admin/dashboard");
 return (data.total_students || 0) > 0;
 } catch { return false; }
 },
 },
 ];

 useEffect(() => {
 // Check if dismissed
 if (typeof window !== "undefined" && localStorage.getItem("onboarding-dismissed") === "1") {
 setDismissed(true);
 setLoading(false);
 return;
 }

 // Check step completion
 Promise.all(steps.map((s) => s.check().then((done) => [s.id, done] as const)))
 .then((results) => {
 const map: Record<string, boolean> = {};
 for (const [id, done] of results) map[id] = done;
 setCompleted(map);
 // If all done, auto-dismiss
 if (Object.values(map).every(Boolean)) {
 setDismissed(true);
 localStorage.setItem("onboarding-dismissed", "1");
 }
 })
 .finally(() => setLoading(false));
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, []);

 const handleDismiss = () => {
 setDismissed(true);
 localStorage.setItem("onboarding-dismissed", "1");
 };

 if (dismissed || loading) return null;

 const completedCount = Object.values(completed).filter(Boolean).length;
 const allDone = completedCount === steps.length;

 return (
 <div className="rounded-lg border border-primary-soft bg-gradient-to-br from-green-50 to-emerald-50 p-6 ">
 <div className="flex items-start justify-between mb-4">
 <div className="flex items-center gap-3">
 <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-soft ">
 <Sparkles className="h-5 w-5 text-primary " />
 </div>
 <div>
 <h3 className="font-bold text-text ">Welcome to GrassLMS!</h3>
 <p className="text-xs text-text-muted ">
 Complete these steps to get your school up and running
 </p>
 </div>
 </div>
 <button onClick={handleDismiss} className="text-text-subtle hover:text-text-muted ">
 <X className="h-4 w-4" />
 </button>
 </div>

 {/* Progress bar */}
 <div className="mb-4 flex items-center gap-2">
 <div className="flex-1 h-2 rounded-pill bg-primary-soft overflow-hidden">
 <div
 className="h-full rounded-pill bg-primary transition-all duration-500"
 style={{ width: `${(completedCount / steps.length) * 100}%` }}
 />
 </div>
 <span className="text-xs font-semibold text-primary ">
 {completedCount}/{steps.length}
 </span>
 </div>

 {/* Steps */}
 <div className="space-y-3">
 {steps.map((step) => {
 const isDone = completed[step.id];
 return (
 <div
 key={step.id}
 className={`flex items-center gap-4 rounded-lg border px-4 py-3 transition-all ${
 isDone
 ? "border-primary-soft bg-success-soft/50 "
 : "border-border-strong bg-paper-2 "
 }`}
 >
 <div className={`rounded-lg p-2 ${
 isDone ? "bg-primary-soft text-primary " : "bg-ink-100 text-text-subtle "
 }`}>
 {isDone ? <CheckCircle className="h-5 w-5" /> : step.icon}
 </div>
 <div className="flex-1 min-w-0">
 <p className={`text-sm font-semibold ${isDone ? "text-success-fg line-through " : "text-ink-700 "}`}>
 {step.title}
 </p>
 <p className="text-xs text-text-muted ">{step.description}</p>
 </div>
 {!isDone && (
 <Link href={step.href}>
 <Button size="sm" variant="outline" className="shrink-0">
 {step.cta} <ArrowRight className="ml-1 h-3 w-3" />
 </Button>
 </Link>
 )}
 </div>
 );
 })}
 </div>
 </div>
 );
}
