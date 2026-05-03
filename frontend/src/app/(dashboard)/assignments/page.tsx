"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import apiClient from "@/lib/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { ClipboardList, Clock, CheckCircle, AlertCircle, FileText, ArrowRight } from "lucide-react";
import type { AssignmentListItem } from "@/types/api";

type FilterTab = "all" | "active" | "overdue" | "graded";

function statusBadge(status: string | null) {
  switch (status) {
    case "submitted":
      return <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-500/20 dark:text-blue-400">Submitted</span>;
    case "graded":
      return <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-500/20 dark:text-green-400">Graded</span>;
    case "late":
      return <span className="rounded-full bg-sun-100 px-2.5 py-0.5 text-xs font-medium text-sun-700 dark:bg-sun-500/20 dark:text-sun-400">Late</span>;
    case "overdue":
      return <span className="rounded-full bg-coral-50 px-2.5 py-0.5 text-xs font-medium text-coral-700 dark:bg-coral-500/20 dark:text-coral-300">Overdue</span>;
    default:
      return <span className="rounded-full bg-ink-100 px-2.5 py-0.5 text-xs font-medium text-ink-700 dark:bg-white/10 dark:text-ink-400">Pending</span>;
  }
}

function timeLeft(dueDate: string) {
  const now = Date.now();
  const due = new Date(dueDate).getTime();
  const diff = due - now;
  if (diff < 0) return "Past due";
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h left`;
  const mins = Math.floor(diff / (1000 * 60));
  return `${mins}m left`;
}

export default function AssignmentsPage() {
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
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-600 border-t-transparent" />
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
    { key: "all", label: "All", count: assignments.length },
    { key: "active", label: "Active", count: assignments.filter((a) => a.status === "pending").length },
    { key: "overdue", label: "Overdue", count: assignments.filter((a) => a.status === "overdue" || a.status === "late").length },
    { key: "graded", label: "Graded", count: assignments.filter((a) => a.status === "graded").length },
  ];

  const borderColor = (status: string | null) => {
    switch (status) {
      case "graded": return "border-l-green-400";
      case "submitted": return "border-l-blue-400";
      case "overdue":
      case "late": return "border-l-coral-300";
      default: return "border-l-green-400";
    }
  };

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-ink-900 dark:text-ink-100">Assignments</h1>
        <p className="mt-1 text-base text-ink-500 dark:text-ink-400">
          View and submit your homework assignments
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
                ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300"
                : "text-ink-500 hover:bg-ink-100 dark:text-ink-400 dark:hover:bg-white/5"
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
            <div className="mb-4 rounded-full bg-ink-100 p-4 dark:bg-white/10">
              <ClipboardList className="h-8 w-8 text-ink-400 dark:text-ink-500" />
            </div>
            <h3 className="mb-1 text-lg font-semibold text-ink-700 dark:text-ink-300">
              No assignments
            </h3>
            <p className="text-base text-ink-500 dark:text-ink-400">
              {tab === "all"
                ? "You don't have any assignments yet."
                : `No ${tab} assignments found.`}
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
                      <div className="rounded-xl bg-green-100 p-3 dark:bg-green-500/20">
                        <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                      </div>
                    ) : a.status === "overdue" || a.status === "late" ? (
                      <div className="rounded-xl bg-coral-50 p-3 dark:bg-coral-500/20">
                        <AlertCircle className="h-5 w-5 text-coral-500 dark:text-coral-300" />
                      </div>
                    ) : a.status === "submitted" ? (
                      <div className="rounded-xl bg-blue-100 p-3 dark:bg-blue-500/20">
                        <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                    ) : (
                      <div className="rounded-xl bg-green-100 p-3 dark:bg-green-500/20">
                        <ClipboardList className="h-5 w-5 text-green-600 dark:text-green-400" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate text-sm font-semibold text-ink-900 dark:text-ink-100">
                        {a.title}
                      </h3>
                      {statusBadge(a.status)}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-500 dark:text-ink-400">
                      {a.course_title && <span>{a.course_title}</span>}
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {timeLeft(a.due_date)}
                      </span>
                      <span>Max: {a.max_score} pts</span>
                      {a.score !== null && a.score !== undefined && (
                        <span className="font-medium text-green-600 dark:text-green-400">
                          Score: {a.score}/{a.max_score}
                        </span>
                      )}
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-ink-300 dark:text-ink-700" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
