"use client";

import { useEffect, useState } from "react";
import apiClient from "@/lib/api-client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { InboxIcon, FileText, Clock, User, ChevronRight, Download } from "lucide-react";

interface QueueItem {
  id: string;
  assignment_id: string;
  assignment_title: string;
  max_score: number;
  student_id: string;
  student_name: string;
  student_email: string;
  content: string | null;
  file_path: string | null;
  original_filename: string | null;
  submitted_at: string;
  status: string;
}

export default function ReviewQueuePage() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<QueueItem | null>(null);
  const [score, setScore] = useState("");
  const [feedback, setFeedback] = useState("");
  const [grading, setGrading] = useState(false);

  const fetchQueue = () => {
    apiClient
      .get("/admin/review-queue")
      .then(({ data }) => setItems(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const handleSelect = (item: QueueItem) => {
    setSelected(item);
    setScore("");
    setFeedback("");
  };

  const handleGrade = async () => {
    if (!selected || !score) return;
    setGrading(true);
    try {
      await apiClient.put(
        `/assignments/${selected.assignment_id}/submissions/${selected.id}/grade`,
        { score: parseFloat(score), feedback }
      );
      toast.success("Graded successfully");
      setItems((prev) => prev.filter((i) => i.id !== selected.id));
      setSelected(null);
    } catch {
      toast.error("Failed to grade");
    } finally {
      setGrading(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl">
        <Skeleton className="mb-2 h-4 w-48" />
        <Skeleton className="mb-6 h-8 w-56" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Review Queue</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {items.length} submission{items.length !== 1 ? "s" : ""} waiting for review
        </p>
      </div>

      {items.length === 0 && !selected ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <div className="mb-4 rounded-full bg-slate-100 p-4 dark:bg-white/10">
              <InboxIcon className="h-8 w-8 text-slate-400 dark:text-slate-500" />
            </div>
            <h3 className="mb-1 text-lg font-semibold text-slate-600 dark:text-slate-300">
              All caught up!
            </h3>
            <p className="text-base text-slate-500 dark:text-slate-400">
              No submissions waiting for review.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Left: submission list */}
          <div className="space-y-2">
            {items.map((item) => (
              <button
                key={item.id}
                onClick={() => handleSelect(item)}
                className={`w-full text-left rounded-xl border p-4 transition-all ${
                  selected?.id === item.id
                    ? "border-green-400 bg-green-50 shadow-sm dark:border-green-500/40 dark:bg-green-500/10"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm dark:border-white/10 dark:bg-[#2C2C2C] dark:hover:border-white/20"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`rounded-lg p-2 ${
                    item.status === "late"
                      ? "bg-orange-100 dark:bg-orange-500/20"
                      : "bg-blue-100 dark:bg-blue-500/20"
                  }`}>
                    <FileText className={`h-4 w-4 ${
                      item.status === "late"
                        ? "text-orange-600 dark:text-orange-400"
                        : "text-blue-600 dark:text-blue-400"
                    }`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {item.assignment_title}
                    </h4>
                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {item.student_name}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(item.submitted_at).toLocaleDateString()}
                      </span>
                      {item.status === "late" && (
                        <span className="rounded-full bg-orange-100 px-1.5 py-0.5 text-[10px] font-medium text-orange-700 dark:bg-orange-500/20 dark:text-orange-400">
                          Late
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-300 dark:text-slate-600" />
                </div>
              </button>
            ))}
          </div>

          {/* Right: detail + grade form */}
          <div>
            {selected ? (
              <Card className="border-l-4 border-l-green-400">
                <CardHeader>
                  <CardTitle className="text-base">{selected.assignment_title}</CardTitle>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {selected.student_name} &middot; {selected.student_email}
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Student answer */}
                  {selected.content && (
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                        Student Answer
                      </label>
                      <div className="max-h-64 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm whitespace-pre-wrap text-slate-800 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
                        {selected.content}
                      </div>
                    </div>
                  )}

                  {/* File attachment */}
                  {selected.original_filename && (
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                        Attached File
                      </label>
                      <a
                        href={`${apiClient.defaults.baseURL?.replace("/api/v1", "")}/uploads/${selected.file_path}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-green-600 transition-colors hover:bg-green-50 dark:border-white/10 dark:text-green-400 dark:hover:bg-green-500/10"
                      >
                        <Download className="h-4 w-4" />
                        {selected.original_filename}
                      </a>
                    </div>
                  )}

                  {!selected.content && !selected.original_filename && (
                    <p className="text-sm text-slate-400 italic">No content submitted.</p>
                  )}

                  {/* Grade form */}
                  <div className="border-t border-slate-200 pt-4 dark:border-white/10">
                    <h4 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Grade Submission
                    </h4>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                          Score (0–{selected.max_score})
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={selected.max_score}
                          value={score}
                          onChange={(e) => setScore(e.target.value)}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-green-500 focus:outline-none dark:border-white/10 dark:bg-[#2C2C2C] dark:text-slate-100"
                          placeholder="Score"
                        />
                      </div>
                    </div>
                    <div className="mt-3">
                      <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                        Feedback (optional)
                      </label>
                      <textarea
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        rows={3}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-green-500 focus:outline-none dark:border-white/10 dark:bg-[#2C2C2C] dark:text-slate-100"
                        placeholder="Write feedback for the student..."
                      />
                    </div>
                    <Button
                      className="mt-3"
                      onClick={handleGrade}
                      disabled={grading || !score}
                    >
                      {grading ? "Grading..." : "Grade"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center p-12 text-center">
                  <p className="text-sm text-slate-400 dark:text-slate-500">
                    Select a submission from the list to review it.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
