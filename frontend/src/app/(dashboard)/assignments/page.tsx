"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import apiClient from "@/lib/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { useTranslation } from "@/lib/i18n/context";
import { ClipboardList, Clock, CheckCircle, AlertCircle, FileText, ArrowRight } from "lucide-react";
import type { AssignmentListItem } from "@/types/api";

type FilterTab = "all" | "active" | "overdue" | "graded";

function useStatusBadge() {
 const { t } = useTranslation();
 function statusBadge(status: string | null) {
 switch (status) {
 case "submitted":
 return <span className="rounded-pill bg-info-soft px-2.5 py-0.5 text-xs font-medium text-info-fg ">{t("assign.statusSubmitted")}</span>;
 case "graded":
 return <span className="rounded-pill bg-primary-soft px-2.5 py-0.5 text-xs font-medium text-success-fg ">{t("assign.statusGraded")}</span>;
 case "late":
 return <span className="rounded-pill bg-coral-300 px-2.5 py-0.5 text-xs font-medium text-coral-700 ">{t("assign.statusLate")}</span>;
 case "overdue":
 return <span className="rounded-pill bg-danger-soft px-2.5 py-0.5 text-xs font-medium text-danger-fg ">{t("assign.statusOverdue")}</span>;
 default:
 return <span className="rounded-pill bg-ink-100 px-2.5 py-0.5 text-xs font-medium text-text-muted ">{t("assign.statusPending")}</span>;
 }
 }
 return statusBadge;
}

function useTimeLeft() {
 const { t } = useTranslation();
 return (dueDate: string) => {
 const now = Date.now();
 const due = new Date(dueDate).getTime();
 const diff = due - now;
 if (diff < 0) return t("assign.pastDue");
 const days = Math.floor(diff / (1000 * 60 * 60 * 24));
 const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
 if (days > 0) return `${days}${t("assign.daysShort")} ${hours}${t("assign.hoursShort")} ${t("assign.leftSuffix")}`;
 if (hours > 0) return `${hours}${t("assign.hoursShort")} ${t("assign.leftSuffix")}`;
 const mins = Math.floor(diff / (1000 * 60));
 return `${mins}${t("assign.minsShort")} ${t("assign.leftSuffix")}`;
 };
}

export default function AssignmentsPage() {
 const { t } = useTranslation();
 const statusBadge = useStatusBadge();
 const timeLeft = useTimeLeft();
 const [assignments, setAssignments] = useState<AssignmentListItem[]>([]);
 const [loading, setLoading] = useState(true);
 const [tab, setTab] = useState<FilterTab>("all");

 useEffect(() => {
 apiClient
 .get("/assignments")
 .then(({ data }) => setAssignments(data))
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

 const filtered = assignments.filter((a) => {
 if (tab === "all") return true;
 if (tab === "active") return a.status === "pending";
 if (tab === "overdue") return a.status === "overdue" || a.status === "late";
 if (tab === "graded") return a.status === "graded";
 return true;
 });

 const tabs: { key: FilterTab; label: string; count: number }[] = [
 { key: "all", label: t("assign.tabAll"), count: assignments.length },
 { key: "active", label: t("assign.tabActive"), count: assignments.filter((a) => a.status === "pending").length },
 { key: "overdue", label: t("assign.tabOverdue"), count: assignments.filter((a) => a.status === "overdue" || a.status === "late").length },
 { key: "graded", label: t("assign.tabGraded"), count: assignments.filter((a) => a.status === "graded").length },
 ];

 const borderColor = (status: string | null) => {
 switch (status) {
 case "graded": return "border-l-emerald-400";
 case "submitted": return "border-l-blue-400";
 case "overdue":
 case "late": return "border-l-red-400";
 default: return "border-l-green-400";
 }
 };

 return (
 <div className="mx-auto max-w-6xl">
 <div className="mb-8">
 <h1 className="text-2xl font-bold text-text ">{t("assign.title")}</h1>
 <p className="mt-1 text-base text-text-muted ">
 {t("assign.subtitle")}
 </p>
 </div>

 {/* Filter tabs */}
 <div className="mb-6 flex gap-2">
 {tabs.map((t) => (
 <button
 key={t.key}
 onClick={() => setTab(t.key)}
 className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
 tab === t.key
 ? "bg-primary-soft text-success-fg "
 : "text-text-muted hover:bg-ink-100 "
 }`}
 >
 {t.label}
 {t.count > 0 && (
 <span className="ml-1.5 text-xs opacity-70">({t.count})</span>
 )}
 </button>
 ))}
 </div>

 {filtered.length === 0 ? (
 <Card>
 <CardContent className="flex flex-col items-center justify-center p-12 text-center">
 <div className="mb-4 rounded-pill bg-ink-100 p-4 ">
 <ClipboardList className="h-8 w-8 text-text-subtle " />
 </div>
 <h3 className="mb-1 text-lg font-semibold text-text-muted ">
 {t("assign.noAssignments")}
 </h3>
 <p className="text-base text-text-muted ">
 {tab === "all"
 ? t("assign.noAssignmentsAll")
 : t("assign.noAssignmentsFiltered")}
 </p>
 </CardContent>
 </Card>
 ) : (
 <div className="space-y-3">
 {filtered.map((a) => (
 <Link key={a.id} href={`/assignments/${a.id}`}>
 <Card className={`border-l-4 ${borderColor(a.status)} transition-shadow hover:shadow-md`}>
 <CardContent className="flex items-center gap-4">
 <div className="hidden shrink-0 sm:block">
 {a.status === "graded" ? (
 <div className="rounded-lg bg-primary-soft p-3 ">
 <CheckCircle className="h-5 w-5 text-primary " />
 </div>
 ) : a.status === "overdue" || a.status === "late" ? (
 <div className="rounded-lg bg-danger-soft p-3 ">
 <AlertCircle className="h-5 w-5 text-danger-fg " />
 </div>
 ) : a.status === "submitted" ? (
 <div className="rounded-lg bg-info-soft p-3 ">
 <FileText className="h-5 w-5 text-info-fg " />
 </div>
 ) : (
 <div className="rounded-lg bg-primary-soft p-3 ">
 <ClipboardList className="h-5 w-5 text-primary " />
 </div>
 )}
 </div>
 <div className="min-w-0 flex-1">
 <div className="flex items-center gap-2">
 <h3 className="truncate text-sm font-semibold text-text ">
 {a.title}
 </h3>
 {statusBadge(a.status)}
 </div>
 <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-muted ">
 {a.course_title && <span>{a.course_title}</span>}
 <span className="flex items-center gap-1">
 <Clock className="h-3 w-3" />
 {timeLeft(a.due_date)}
 </span>
 <span>{t("assign.maxLabel")}: {a.max_score} {t("assign.ptsLabel")}</span>
 {a.score !== null && a.score !== undefined && (
 <span className="font-medium text-primary ">
 {t("assign.scoreLabel")}: {a.score}/{a.max_score}
 </span>
 )}
 </div>
 </div>
 <ArrowRight className="h-4 w-4 shrink-0 text-ink-300 " />
 </CardContent>
 </Card>
 </Link>
 ))}
 </div>
 )}
 </div>
 );
}
