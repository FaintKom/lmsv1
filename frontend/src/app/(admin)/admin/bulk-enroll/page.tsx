"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  AlertCircle,
  CheckCircle,
  Download,
  FileText,
  Upload,
  Users,
  UserPlus,
} from "lucide-react";

import apiClient from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Course {
  id: string;
  title: string;
  is_template?: boolean;
}

interface Group {
  id: string;
  name: string;
  member_count: number;
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

interface BulkImportResponse {
  created: number;
  skipped: number;
  errors: string[];
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

function downloadSampleCsv() {
  const blob = new Blob([CSV_TEMPLATE], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "student_import_template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

type ImportMode = "enroll" | "import";

export default function BulkEnrollPage() {
  const [mode, setMode] = useState<ImportMode>("enroll");
  const [courses, setCourses] = useState<Course[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [courseId, setCourseId] = useState("");
  const [groupId, setGroupId] = useState("");
  const [csvText, setCsvText] = useState("");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [defaultPassword, setDefaultPassword] = useState("Welcome2026!");
  const [submitting, setSubmitting] = useState(false);
  const [enrollResult, setEnrollResult] = useState<BulkEnrollResponse | null>(null);
  const [importResult, setImportResult] = useState<BulkImportResponse | null>(null);
  const [parseError, setParseError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    apiClient
      .get("/courses?page=1&per_page=100")
      .then(({ data }) => {
        const items = (data?.items || []) as Course[];
        setCourses(items.filter((c) => !c.is_template));
      })
      .catch(() => toast.error("Failed to load courses"));

    apiClient
      .get("/admin/groups")
      .then(({ data }) => setGroups(data || []))
      .catch(() => {});
  }, []);

  const handleFile = async (file: File) => {
    setCsvFile(file);
    const text = await file.text();
    setCsvText(text);
    setParseError("");
    setEnrollResult(null);
    setImportResult(null);
  };

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith(".csv") || file.type === "text/csv")) {
      handleFile(file);
    } else {
      toast.error("Please drop a CSV file");
    }
  }, []);

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
    setEnrollResult(null);
    setImportResult(null);
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

  const handleSubmitEnroll = async () => {
    if (!courseId) {
      toast.error("Pick a course first");
      return;
    }
    if (parsed.length === 0) {
      toast.error("No valid rows to import");
      return;
    }
    setSubmitting(true);
    setEnrollResult(null);
    try {
      const { data } = await apiClient.post<BulkEnrollResponse>(
        "/admin/bulk-enroll",
        {
          course_id: courseId,
          rows: parsed,
          default_password: defaultPassword,
        }
      );
      setEnrollResult(data);
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

  const handleSubmitImport = async () => {
    if (parsed.length === 0 && !csvFile) {
      toast.error("No valid rows to import");
      return;
    }
    setSubmitting(true);
    setImportResult(null);
    try {
      const formData = new FormData();

      // Build file from textarea if no file was uploaded
      const fileToSend =
        csvFile ||
        new File([csvText], "import.csv", { type: "text/csv" });
      formData.append("file", fileToSend);
      if (groupId) {
        formData.append("group_id", groupId);
      }

      const { data } = await apiClient.post<BulkImportResponse>(
        "/admin/bulk-import-students",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      setImportResult(data);
      if (data.errors.length === 0) {
        toast.success(`Created ${data.created} students, ${data.skipped} skipped`);
      } else {
        toast.warning(`Import finished with ${data.errors.length} error(s)`);
      }
    } catch (err) {
      const e = err as { response?: { data?: { detail?: string } } };
      toast.error(e?.response?.data?.detail || "Import failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-ink-900 dark:text-ink-100">
          Bulk Student Import
        </h1>
        <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
          Upload a CSV to create student accounts and optionally enroll them in a course.
        </p>
      </div>

      {/* Mode toggle */}
      <div className="mb-6 flex gap-2">
        <button
          onClick={() => setMode("enroll")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            mode === "enroll"
              ? "bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-300"
              : "bg-ink-100 text-ink-700 hover:bg-ink-200 dark:bg-white/5 dark:text-ink-400 dark:hover:bg-white/10"
          }`}
        >
          <Users className="h-4 w-4" />
          Create &amp; Enroll in Course
        </button>
        <button
          onClick={() => setMode("import")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            mode === "import"
              ? "bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-300"
              : "bg-ink-100 text-ink-700 hover:bg-ink-200 dark:bg-white/5 dark:text-ink-400 dark:hover:bg-white/10"
          }`}
        >
          <UserPlus className="h-4 w-4" />
          Import Students Only
        </button>
      </div>

      {/* Course selector (enroll mode only) */}
      {mode === "enroll" && (
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
              className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 dark:border-white/10 dark:bg-white/5 dark:text-ink-100"
            >
              <option value="">-- Select a course --</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </CardContent>
        </Card>
      )}

      {/* Group selector (import mode) */}
      {mode === "import" && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4" />
              1. Assign to group (optional)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <select
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 dark:border-white/10 dark:bg-white/5 dark:text-ink-100"
            >
              <option value="">-- No group --</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} ({g.member_count} members)
                </option>
              ))}
            </select>
          </CardContent>
        </Card>
      )}

      {/* CSV Upload with Drag & Drop */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" />
            2. Upload CSV
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-ink-700 dark:text-ink-400">
              Format: header row with <code className="rounded bg-ink-100 px-1 dark:bg-white/10">email</code> (required),{" "}
              <code className="rounded bg-ink-100 px-1 dark:bg-white/10">name</code> and{" "}
              <code className="rounded bg-ink-100 px-1 dark:bg-white/10">password</code> (optional).
            </p>
            <button
              type="button"
              onClick={downloadSampleCsv}
              className="flex items-center gap-1 text-xs font-medium text-green-600 hover:underline dark:text-green-400"
            >
              <Download className="h-3 w-3" />
              Download template
            </button>
          </div>

          {/* Drag & Drop Zone */}
          <div
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-colors ${
              isDragging
                ? "border-green-400 bg-green-50 dark:border-green-500 dark:bg-green-500/10"
                : "border-ink-300 bg-ink-50 hover:border-ink-400 dark:border-white/20 dark:bg-white/5 dark:hover:border-white/30"
            }`}
          >
            <Upload className={`mb-2 h-8 w-8 ${isDragging ? "text-green-500" : "text-ink-400"}`} />
            <p className="text-sm font-medium text-ink-700 dark:text-ink-300">
              {isDragging ? "Drop CSV file here" : "Drag & drop a CSV file, or click to browse"}
            </p>
            <p className="mt-1 text-xs text-ink-400">Only .csv files accepted</p>
            {csvFile && (
              <p className="mt-2 text-xs font-medium text-green-600 dark:text-green-400">
                Loaded: {csvFile.name}
              </p>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
              className="hidden"
            />
          </div>

          {/* Manual textarea */}
          <details className="group">
            <summary className="cursor-pointer text-xs font-medium text-ink-500 hover:text-ink-700 dark:text-ink-400 dark:hover:text-ink-300">
              Or paste CSV text manually
            </summary>
            <textarea
              value={csvText}
              onChange={(e) => {
                setCsvText(e.target.value);
                setCsvFile(null);
                setParseError("");
              }}
              placeholder={CSV_TEMPLATE}
              rows={8}
              className="mt-2 w-full rounded-lg border border-ink-200 bg-white px-3 py-2 font-mono text-xs text-ink-900 dark:border-white/10 dark:bg-white/5 dark:text-ink-100"
            />
          </details>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setCsvText(CSV_TEMPLATE);
                setCsvFile(null);
              }}
              className="text-xs font-medium text-green-600 hover:underline dark:text-green-400"
            >
              Use sample template
            </button>
            <Button variant="outline" size="sm" onClick={handlePreview}>
              Preview
            </Button>
          </div>

          {parseError && (
            <p className="flex items-center gap-1 text-xs text-coral-500">
              <AlertCircle className="h-3.5 w-3.5" />
              {parseError}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Preview Table */}
      {parsed.length > 0 && !parseError && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">
              Preview ({parsed.length} row{parsed.length === 1 ? "" : "s"})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-72 overflow-auto rounded-lg border border-ink-200 dark:border-white/10">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-ink-50 dark:bg-white/5">
                  <tr>
                    <th className="px-3 py-2 font-semibold text-ink-700 dark:text-ink-400">#</th>
                    <th className="px-3 py-2 font-semibold text-ink-700 dark:text-ink-400">Email</th>
                    <th className="px-3 py-2 font-semibold text-ink-700 dark:text-ink-400">Name</th>
                    <th className="px-3 py-2 font-semibold text-ink-700 dark:text-ink-400">Password</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100 dark:divide-white/5">
                  {parsed.map((row, i) => (
                    <tr key={i} className="hover:bg-ink-50 dark:hover:bg-white/5">
                      <td className="px-3 py-1.5 text-ink-400">{i + 1}</td>
                      <td className="px-3 py-1.5 font-mono text-ink-900 dark:text-ink-100">{row.email}</td>
                      <td className="px-3 py-1.5 text-ink-700 dark:text-ink-300">{row.full_name || <span className="italic text-ink-400">auto</span>}</td>
                      <td className="px-3 py-1.5 text-ink-500">{row.password ? "***" : <span className="italic text-ink-400">{mode === "enroll" ? "default" : "random"}</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Default password (enroll mode) */}
      {mode === "enroll" && (
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
              className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 dark:border-white/10 dark:bg-white/5 dark:text-ink-100"
            />
            <p className="mt-1 text-xs text-ink-500 dark:text-ink-400">
              Minimum 8 characters. Students should change this on first login.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Submit button */}
      {mode === "enroll" ? (
        <Button
          onClick={handleSubmitEnroll}
          disabled={submitting || !courseId || parsed.length === 0}
          className="w-full"
        >
          {submitting
            ? "Importing..."
            : `Import & Enroll ${parsed.length} student${parsed.length === 1 ? "" : "s"}`}
        </Button>
      ) : (
        <Button
          onClick={handleSubmitImport}
          disabled={submitting || parsed.length === 0}
          className="w-full"
        >
          {submitting
            ? "Importing..."
            : `Import ${parsed.length} student${parsed.length === 1 ? "" : "s"}`}
        </Button>
      )}

      {/* Enroll Results */}
      {enrollResult && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Import results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Total" value={enrollResult.total} />
              <Stat label="Created" value={enrollResult.created} />
              <Stat label="Reused" value={enrollResult.reused} />
              <Stat label="Enrolled" value={enrollResult.enrolled} />
            </div>
            {enrollResult.already_enrolled > 0 && (
              <p className="mb-3 text-xs text-ink-500">
                {enrollResult.already_enrolled} student
                {enrollResult.already_enrolled === 1 ? " was" : "s were"} already
                enrolled in the course (skipped).
              </p>
            )}
            {enrollResult.errors.length > 0 && (
              <ErrorList errors={enrollResult.errors.map((e) => `Row ${e.row} (${e.email || "-"}): ${e.message}`)} />
            )}
          </CardContent>
        </Card>
      )}

      {/* Import-only Results */}
      {importResult && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Import results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Stat label="Created" value={importResult.created} />
              <Stat label="Skipped" value={importResult.skipped} />
              <Stat label="Errors" value={importResult.errors.length} />
            </div>
            {importResult.errors.length > 0 && (
              <ErrorList errors={importResult.errors} />
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-ink-200 bg-white p-3 text-center dark:border-white/10 dark:bg-white/5">
      <div className="text-2xl font-bold text-ink-900 dark:text-ink-100">{value}</div>
      <div className="text-xs text-ink-500 dark:text-ink-400">{label}</div>
    </div>
  );
}

function ErrorList({ errors }: { errors: string[] }) {
  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-coral-700 dark:text-coral-300">
        Errors ({errors.length})
      </p>
      <div className="max-h-48 overflow-y-auto rounded-lg border border-coral-300 bg-coral-50 p-3 dark:border-coral-500/30 dark:bg-coral-500/10">
        {errors.map((err, i) => (
          <div key={i} className="mb-1 text-xs text-coral-700 dark:text-coral-300">
            {err}
          </div>
        ))}
      </div>
    </div>
  );
}
