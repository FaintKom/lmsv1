"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  AlertCircle,
  CheckCircle,
  FileText,
  Upload,
  Users,
} from "lucide-react";

import apiClient from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Course {
  id: string;
  title: string;
  is_template?: boolean;
}

interface ParsedRow {
  email: string;
  full_name: string;
  password?: string;
}

interface BulkEnrollResponse {
  total: number;
  created: number;
  reused: number;
  enrolled: number;
  already_enrolled: number;
  errors: { row: number; email: string; message: string }[];
}

const CSV_TEMPLATE = `email,full_name,password
alice@example.com,Alice Johnson,
bob@example.com,Bob Smith,
charlie@example.com,Charlie Brown,`;

function parseCsv(text: string): ParsedRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length === 0) return [];

  // Header row must contain at least "email"
  const header = lines[0].toLowerCase().split(",").map((h) => h.trim());
  const emailIdx = header.indexOf("email");
  if (emailIdx === -1) {
    throw new Error("CSV must have an `email` column in the first row");
  }
  const nameIdx =
    header.indexOf("full_name") >= 0
      ? header.indexOf("full_name")
      : header.indexOf("name");
  const passIdx = header.indexOf("password");

  const rows: ParsedRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(",").map((c) => c.trim());
    const email = cells[emailIdx] || "";
    if (!email) continue;
    rows.push({
      email,
      full_name: nameIdx >= 0 ? cells[nameIdx] || "" : "",
      password: passIdx >= 0 ? cells[passIdx] || "" : "",
    });
  }
  return rows;
}

export default function BulkEnrollPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseId, setCourseId] = useState("");
  const [csvText, setCsvText] = useState("");
  const [defaultPassword, setDefaultPassword] = useState("Welcome2026!");
  const [parsing, setParsing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<BulkEnrollResponse | null>(null);
  const [parseError, setParseError] = useState("");

  useEffect(() => {
    apiClient
      .get("/courses?page=1&per_page=100")
      .then(({ data }) => {
        const items = (data?.items || []) as Course[];
        // Exclude templates — can't enroll into them
        setCourses(items.filter((c) => !c.is_template));
      })
      .catch(() => {
        toast.error("Failed to load courses");
      });
  }, []);

  const handleFile = async (file: File) => {
    const text = await file.text();
    setCsvText(text);
  };

  const parsed: ParsedRow[] = (() => {
    if (!csvText.trim()) return [];
    try {
      return parseCsv(csvText);
    } catch {
      return [];
    }
  })();

  const handlePreview = () => {
    setParseError("");
    setResult(null);
    try {
      const rows = parseCsv(csvText);
      if (rows.length === 0) {
        setParseError("No data rows found in CSV");
        return;
      }
      toast.success(`Parsed ${rows.length} row${rows.length === 1 ? "" : "s"}`);
    } catch (e) {
      setParseError((e as Error).message);
    }
  };

  const handleSubmit = async () => {
    if (!courseId) {
      toast.error("Pick a course first");
      return;
    }
    if (parsed.length === 0) {
      toast.error("No valid rows to import");
      return;
    }
    setSubmitting(true);
    setResult(null);
    try {
      const { data } = await apiClient.post<BulkEnrollResponse>(
        "/admin/bulk-enroll",
        {
          course_id: courseId,
          rows: parsed,
          default_password: defaultPassword,
        }
      );
      setResult(data);
      if (data.errors.length === 0) {
        toast.success(
          `Imported ${data.total} students: ${data.created} new, ${data.enrolled} enrolled`
        );
      } else {
        toast.warning(
          `Imported with ${data.errors.length} error${data.errors.length === 1 ? "" : "s"}`
        );
      }
    } catch (err) {
      const e = err as { response?: { data?: { detail?: string } } };
      toast.error(e?.response?.data?.detail || "Import failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          Bulk Enroll Students
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Upload a CSV to create student accounts and enroll them in a course in one step.
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4" />
            1. Pick course
          </CardTitle>
        </CardHeader>
        <CardContent>
          <select
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
          >
            <option value="">— Select a course —</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" />
            2. Upload CSV
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="mb-2 text-xs font-medium text-slate-600 dark:text-slate-400">
              Format: first row must be a header with `email` and (optionally)
              `full_name` and `password` columns.
            </p>
            <div className="flex items-center gap-3">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                <Upload className="h-4 w-4" />
                Choose file
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                  }}
                  className="hidden"
                />
              </label>
              <button
                type="button"
                onClick={() => setCsvText(CSV_TEMPLATE)}
                className="text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400"
              >
                Use sample template
              </button>
            </div>
          </div>
          <textarea
            value={csvText}
            onChange={(e) => {
              setCsvText(e.target.value);
              setParseError("");
            }}
            placeholder={CSV_TEMPLATE}
            rows={10}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
          />
          {parseError && (
            <p className="flex items-center gap-1 text-xs text-rose-600">
              <AlertCircle className="h-3.5 w-3.5" />
              {parseError}
            </p>
          )}
          {parsed.length > 0 && !parseError && (
            <p className="text-xs text-slate-500">
              Parsed <span className="font-semibold">{parsed.length}</span> row
              {parsed.length === 1 ? "" : "s"}
            </p>
          )}
          <Button variant="outline" onClick={handlePreview}>
            Preview
          </Button>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4" />
            3. Default password (for rows without one)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <input
            type="text"
            value={defaultPassword}
            onChange={(e) => setDefaultPassword(e.target.value)}
            placeholder="Welcome2026!"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
          />
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Minimum 8 characters. Students should change this on first login.
          </p>
        </CardContent>
      </Card>

      <Button
        onClick={handleSubmit}
        disabled={submitting || !courseId || parsed.length === 0}
        className="w-full"
      >
        {submitting ? "Importing..." : `Import ${parsed.length} student${parsed.length === 1 ? "" : "s"}`}
      </Button>

      {result && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
              Import results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Total" value={result.total} />
              <Stat label="Created" value={result.created} />
              <Stat label="Reused" value={result.reused} />
              <Stat label="Enrolled" value={result.enrolled} />
            </div>
            {result.already_enrolled > 0 && (
              <p className="mb-3 text-xs text-slate-500">
                {result.already_enrolled} student
                {result.already_enrolled === 1 ? " was" : "s were"} already
                enrolled in the course (skipped).
              </p>
            )}
            {result.errors.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-semibold text-rose-700 dark:text-rose-400">
                  Errors ({result.errors.length})
                </p>
                <div className="max-h-48 overflow-y-auto rounded-lg border border-rose-200 bg-rose-50 p-3 dark:border-rose-500/30 dark:bg-rose-500/10">
                  {result.errors.map((err, i) => (
                    <div key={i} className="mb-1 text-xs text-rose-700 dark:text-rose-400">
                      Row {err.row} ({err.email || "—"}): {err.message}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 text-center dark:border-white/10 dark:bg-white/5">
      <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{value}</div>
      <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
    </div>
  );
}
