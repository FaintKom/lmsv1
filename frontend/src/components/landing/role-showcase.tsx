"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import {
 GraduationCap,
 Presentation,
 BookOpen,
 Code2,
 Trophy,
 ClipboardList,
 Video,
 CheckCircle,
 LayoutGrid,
 Table2,
 ClipboardCheck,
 Users,
 BarChart3,
 ArrowRight,
 Flame,
 Award,
 type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n/context";

type Role = "student" | "teacher";

const STUDENT_FEATURES: { icon: LucideIcon; key: string }[] = [
 { icon: BookOpen, key: "landing.roles.s1" },
 { icon: Code2, key: "landing.roles.s2" },
 { icon: Trophy, key: "landing.roles.s3" },
 { icon: Award, key: "landing.roles.s4" },
 { icon: ClipboardList, key: "landing.roles.s5" },
 { icon: GraduationCap, key: "landing.roles.s6" },
];

const TEACHER_FEATURES: { icon: LucideIcon; key: string }[] = [
 { icon: LayoutGrid, key: "landing.roles.t1" },
 { icon: Table2, key: "landing.roles.t2" },
 { icon: ClipboardCheck, key: "landing.roles.t3" },
 { icon: Users, key: "landing.roles.t4" },
 { icon: BarChart3, key: "landing.roles.t5" },
 { icon: Video, key: "landing.roles.t6" },
];

// Faux browser window chrome — pure decoration, shared by both mockups.
function WindowChrome({ children }: { children: ReactNode }) {
 return (
 <div className="overflow-hidden rounded-xl border border-border-strong bg-surface shadow-xl">
 <div className="flex items-center gap-1.5 border-b border-border-strong bg-surface-2/70 px-4 py-2.5">
 <span className="h-2.5 w-2.5 rounded-full bg-danger/60" />
 <span className="h-2.5 w-2.5 rounded-full bg-warning/70" />
 <span className="h-2.5 w-2.5 rounded-full bg-primary/60" />
 </div>
 <div className="p-5">{children}</div>
 </div>
 );
}

// ─── Student demo mockup ────────────────────────────────────────────
function StudentMock() {
 const { t } = useTranslation();
 return (
 <WindowChrome>
 {/* Course progress card */}
 <div className="rounded-lg border border-border bg-surface-2/40 p-4">
 <div className="mb-2 flex items-center justify-between">
 <span className="flex items-center gap-2 text-sm font-semibold text-text">
 <span className="text-lg">🐍</span> {t("landing.roles.mockCourse")}
 </span>
 <span className="text-sm font-bold text-primary">85%</span>
 </div>
 <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
 <div className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-500" style={{ width: "85%" }} />
 </div>
 <p className="mt-2 text-xs text-text-subtle">{t("landing.roles.mockProgress")}</p>
 </div>

 {/* XP + streak row */}
 <div className="mt-3 grid grid-cols-2 gap-3">
 <div className="flex items-center gap-2 rounded-lg border border-sun-100 bg-sun-50 px-3 py-2.5">
 <Award className="h-5 w-5 text-warning-fg" />
 <div>
 <p className="text-sm font-bold text-warning-fg">1240 XP</p>
 <p className="text-[10px] text-warning-fg">Gold</p>
 </div>
 </div>
 <div className="flex items-center gap-2 rounded-lg border border-danger-soft bg-danger-soft/60 px-3 py-2.5">
 <Flame className="h-5 w-5 text-danger-fg" />
 <div>
 <p className="text-sm font-bold text-danger-fg">7 🔥</p>
 <p className="text-[10px] text-danger-fg">streak</p>
 </div>
 </div>
 </div>

 {/* Lesson checklist */}
 <div className="mt-3 space-y-1.5">
 {[true, true, false].map((done, i) => (
 <div key={i} className="flex items-center gap-2.5 rounded-lg border border-border bg-surface px-3 py-2">
 <CheckCircle className={`h-4 w-4 shrink-0 ${done ? "text-primary" : "text-ink-200"}`} />
 <span className="h-2 rounded-full bg-surface-2" style={{ width: `${55 + i * 12}%` }} />
 </div>
 ))}
 </div>
 </WindowChrome>
 );
}

// ─── Teacher demo mockup ────────────────────────────────────────────
function TeacherMock() {
 const { t } = useTranslation();
 // green >=80, yellow 60-79, red <60 — mirrors the real gradebook color scale.
 const grades = [
 [92, 78, 55],
 [88, 84, 71],
 [64, 90, 82],
 ];
 const cell = (v: number) =>
 v >= 80
 ? "bg-success-soft text-success-fg"
 : v >= 60
 ? "bg-sun-50 text-warning-fg"
 : "bg-danger-soft text-danger-fg";
 return (
 <WindowChrome>
 {/* Gradebook */}
 <div className="rounded-lg border border-border bg-surface-2/40 p-3">
 <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-text">
 <Table2 className="h-4 w-4 text-primary" /> {t("landing.roles.mockGradebook")}
 </p>
 <div className="space-y-1.5">
 {grades.map((row, r) => (
 <div key={r} className="flex items-center gap-1.5">
 <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-2 text-[10px] font-bold text-text-muted">
 {String.fromCharCode(65 + r)}
 </span>
 {row.map((v, c) => (
 <span key={c} className={`flex-1 rounded py-1.5 text-center text-xs font-bold ${cell(v)}`}>
 {v}
 </span>
 ))}
 </div>
 ))}
 </div>
 </div>

 {/* Review queue + avg row */}
 <div className="mt-3 grid grid-cols-2 gap-3">
 <div className="flex items-center gap-2 rounded-lg border border-info-soft bg-info-soft/50 px-3 py-2.5">
 <ClipboardCheck className="h-5 w-5 text-info-fg" />
 <div>
 <p className="text-sm font-bold text-info-fg">5</p>
 <p className="text-[10px] text-info-fg">{t("landing.roles.mockReview")}</p>
 </div>
 </div>
 <div className="flex items-center gap-2 rounded-lg border border-primary-soft bg-success-soft/60 px-3 py-2.5">
 <BarChart3 className="h-5 w-5 text-primary" />
 <div>
 <p className="text-sm font-bold text-success-fg">79%</p>
 <p className="text-[10px] text-success-fg">{t("landing.roles.mockAvg")}</p>
 </div>
 </div>
 </div>
 </WindowChrome>
 );
}

export function RoleShowcase() {
 const { t } = useTranslation();
 const [role, setRole] = useState<Role>("student");

 const features = role === "student" ? STUDENT_FEATURES : TEACHER_FEATURES;
 const lede = role === "student" ? "landing.roles.studentLede" : "landing.roles.teacherLede";

 return (
 <section className="border-t border-border bg-surface py-20">
 <div className="mx-auto max-w-6xl px-6">
 <div className="mb-10 text-center">
 <h2 className="mb-3 text-3xl font-bold text-text">{t("landing.roles.title")}</h2>
 <p className="text-text-muted">{t("landing.roles.subtitle")}</p>
 </div>

 {/* Role switch */}
 <div className="mb-10 flex justify-center">
 <div className="inline-flex rounded-pill bg-surface-2 p-1">
 <button
 onClick={() => setRole("student")}
 className={`flex items-center gap-2 rounded-pill px-6 py-2.5 text-sm font-semibold transition ${
 role === "student" ? "bg-surface text-text shadow-sm" : "text-text-muted hover:text-text"
 }`}
 >
 <GraduationCap className="h-4 w-4" />
 {t("landing.roles.tabStudent")}
 </button>
 <button
 onClick={() => setRole("teacher")}
 className={`flex items-center gap-2 rounded-pill px-6 py-2.5 text-sm font-semibold transition ${
 role === "teacher" ? "bg-surface text-text shadow-sm" : "text-text-muted hover:text-text"
 }`}
 >
 <Presentation className="h-4 w-4" />
 {t("landing.roles.tabTeacher")}
 </button>
 </div>
 </div>

 {/* keyed on role so the fade re-runs on every switch */}
 <div key={role} className="grid role-fade items-center gap-10 md:grid-cols-2">
 {/* Left: feature list */}
 <div className={role === "teacher" ? "md:order-2" : ""}>
 <p className="mb-6 text-lg leading-relaxed text-text-muted">{t(lede)}</p>
 <ul className="space-y-3">
 {features.map(({ icon: Icon, key }) => (
 <li key={key} className="flex items-center gap-3">
 <span className="inline-flex shrink-0 rounded-lg bg-success-soft p-2.5">
 <Icon className="h-5 w-5 text-primary" />
 </span>
 <span className="text-sm font-medium text-text">{t(key)}</span>
 </li>
 ))}
 </ul>
 </div>

 {/* Right: demonstration mockup */}
 <div className={role === "teacher" ? "md:order-1" : ""}>
 {role === "student" ? <StudentMock /> : <TeacherMock />}
 </div>
 </div>

 <div className="mt-12 text-center">
 <Link href="/register">
 <Button size="lg">
 {t("landing.ctaCreateFree")}
 <ArrowRight className="ml-2 h-4 w-4" />
 </Button>
 </Link>
 </div>
 </div>
 </section>
 );
}
