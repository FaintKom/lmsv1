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
import { useTranslation } from "@/lib/i18n/context";

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
 const { t } = useTranslation();
 const [mode, setMode] = useState<ImportMode>("enroll");
 const [courses, setCourses] = useState<Course[]>([]);
 const [groups, setGroups] = useState<Group[]>([]);
 const [courseId, setCourseId] = useState("");
 const [groupId, setGroupId] = useState("");
 const [csvText, setCsvText] = useState("");
 const [csvFile, setCsvFile] = useState<File | null>(null);
 const [defaultPassword, setDefaultPassword] = useState("Welcome2026!");
 const [parentalConsent, setParentalConsent] = useState(false);
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
 .catch(() => toast.error(t("admin.bulkEnroll.failedLoadCourses")));

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
 toast.error(t("admin.bulkEnroll.dropCsv"));
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
 setParseError(t("admin.bulkEnroll.noDataRows"));
 return;
 }
 toast.success(t("admin.bulkEnroll.parsedRows").replace("{n}", String(rows.length)));
 } catch (e) {
 setParseError((e as Error).message);
 }
 };

 const handleSubmitEnroll = async () => {
 if (!courseId) {
 toast.error(t("admin.bulkEnroll.pickCourseFirst"));
 return;
 }
 if (parsed.length === 0) {
 toast.error(t("admin.bulkEnroll.noValidRows"));
 return;
 }
 if (!parentalConsent) {
 toast.error(t("admin.bulkEnroll.parentalConsentRequired"));
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
 parental_consent: parentalConsent,
 }
 );
 setEnrollResult(data);
 if (data.errors.length === 0) {
 toast.success(
 t("admin.bulkEnroll.importedSummary")
 .replace("{total}", String(data.total))
 .replace("{created}", String(data.created))
 .replace("{enrolled}", String(data.enrolled))
 );
 } else {
 toast.warning(
 t("admin.bulkEnroll.importedWithErrors").replace("{n}", String(data.errors.length))
 );
 }
 } catch (err) {
 const e = err as { response?: { data?: { detail?: string } } };
 toast.error(e?.response?.data?.detail || t("admin.bulkEnroll.importFailed"));
 } finally {
 setSubmitting(false);
 }
 };

 const handleSubmitImport = async () => {
 if (parsed.length === 0 && !csvFile) {
 toast.error(t("admin.bulkEnroll.noValidRows"));
 return;
 }
 if (!parentalConsent) {
 toast.error(t("admin.bulkEnroll.parentalConsentRequired"));
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

 // group_id and parental_consent are query params on the backend.
 const params: Record<string, string> = { parental_consent: "true" };
 if (groupId) {
 params.group_id = groupId;
 }

 const { data } = await apiClient.post<BulkImportResponse>(
 "/admin/bulk-import-students",
 formData,
 {
 headers: { "Content-Type": "multipart/form-data" },
 params,
 }
 );
 setImportResult(data);
 if (data.errors.length === 0) {
 toast.success(
 t("admin.bulkEnroll.createdStudents").replace("{created}", String(data.created)).replace("{skipped}", String(data.skipped))
 );
 } else {
 toast.warning(t("admin.bulkEnroll.finishedWithErrors").replace("{n}", String(data.errors.length)));
 }
 } catch (err) {
 const e = err as { response?: { data?: { detail?: string } } };
 toast.error(e?.response?.data?.detail || t("admin.bulkEnroll.importFailed"));
 } finally {
 setSubmitting(false);
 }
 };

 return (
 <div className="mx-auto max-w-4xl">
 <div className="mb-8">
 <h1 className="text-2xl font-bold text-text ">
 {t("admin.bulkEnroll.title")}
 </h1>
 <p className="mt-1 text-sm text-text-muted ">
 {t("admin.bulkEnroll.subtitle")}
 </p>
 </div>

 {/* Mode toggle */}
 <div className="mb-6 flex gap-2">
 <button
 onClick={() => setMode("enroll")}
 className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
 mode === "enroll"
 ? "bg-primary-soft text-success-fg "
 : "bg-ink-100 text-text-muted hover:bg-ink-200 "
 }`}
 >
 <Users className="h-4 w-4" />
 {t("admin.bulkEnroll.enrollMode")}
 </button>
 <button
 onClick={() => setMode("import")}
 className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
 mode === "import"
 ? "bg-primary-soft text-success-fg "
 : "bg-ink-100 text-text-muted hover:bg-ink-200 "
 }`}
 >
 <UserPlus className="h-4 w-4" />
 {t("admin.bulkEnroll.importMode")}
 </button>
 </div>

 {/* Course selector (enroll mode only) */}
 {mode === "enroll" && (
 <Card className="mb-6">
 <CardHeader>
 <CardTitle className="flex items-center gap-2 text-base">
 <Users className="h-4 w-4" />
 {t("admin.bulkEnroll.pickCourse")}
 </CardTitle>
 </CardHeader>
 <CardContent>
 <select
 value={courseId}
 onChange={(e) => setCourseId(e.target.value)}
 className="w-full rounded-lg border border-border-strong bg-paper-2 px-3 py-2 text-sm text-text "
 >
 <option value="">{t("admin.bulkEnroll.selectCourseOption")}</option>
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
 {t("admin.bulkEnroll.assignGroup")}
 </CardTitle>
 </CardHeader>
 <CardContent>
 <select
 value={groupId}
 onChange={(e) => setGroupId(e.target.value)}
 className="w-full rounded-lg border border-border-strong bg-paper-2 px-3 py-2 text-sm text-text "
 >
 <option value="">{t("admin.bulkEnroll.noGroupOption")}</option>
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
 {t("admin.bulkEnroll.uploadCsv")}
 </CardTitle>
 </CardHeader>
 <CardContent className="space-y-4">
 <div className="flex items-center justify-between">
 <p className="text-xs font-medium text-text-muted ">
 Format: header row with <code className="rounded bg-ink-100 px-1 ">email</code> (required),{" "}
 <code className="rounded bg-ink-100 px-1 ">name</code> and{" "}
 <code className="rounded bg-ink-100 px-1 ">password</code> (optional).
 </p>
 <button
 type="button"
 onClick={downloadSampleCsv}
 className="flex items-center gap-1 text-xs font-medium text-primary hover:underline "
 >
 <Download className="h-3 w-3" />
 {t("admin.bulkEnroll.downloadTemplate")}
 </button>
 </div>

 {/* Drag & Drop Zone */}
 <div
 onDragOver={onDragOver}
 onDragLeave={onDragLeave}
 onDrop={onDrop}
 onClick={() => fileInputRef.current?.click()}
 className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${
 isDragging
 ? "border-primary bg-success-soft "
 : "border-ink-300 bg-surface-2 hover:border-ink-400 "
 }`}
 >
 <Upload className={`mb-2 h-8 w-8 ${isDragging ? "text-primary" : "text-text-subtle"}`} />
 <p className="text-sm font-medium text-text-muted ">
 {isDragging ? t("admin.bulkEnroll.dropHere") : t("admin.bulkEnroll.dragOrClick")}
 </p>
 <p className="mt-1 text-xs text-text-subtle">{t("admin.bulkEnroll.onlyCsv")}</p>
 {csvFile && (
 <p className="mt-2 text-xs font-medium text-primary ">
 {t("admin.bulkEnroll.loaded")} {csvFile.name}
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
 <summary className="cursor-pointer text-xs font-medium text-text-muted hover:text-ink-700 ">
 {t("admin.bulkEnroll.pasteManually")}
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
 className="mt-2 w-full rounded-lg border border-border-strong bg-paper-2 px-3 py-2 font-mono text-xs text-text "
 />
 </details>

 <div className="flex items-center gap-3">
 <button
 type="button"
 onClick={() => {
 setCsvText(CSV_TEMPLATE);
 setCsvFile(null);
 }}
 className="text-xs font-medium text-primary hover:underline "
 >
 {t("admin.bulkEnroll.useSample")}
 </button>
 <Button variant="outline" size="sm" onClick={handlePreview}>
 {t("admin.bulkEnroll.previewBtn")}
 </Button>
 </div>

 {parseError && (
 <p className="flex items-center gap-1 text-xs text-danger-fg">
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
 {t("admin.bulkEnroll.previewTitle")} ({parsed.length})
 </CardTitle>
 </CardHeader>
 <CardContent>
 <div className="max-h-72 overflow-auto rounded-lg border border-border-strong ">
 <table className="w-full text-left text-xs">
 <thead className="sticky top-0 bg-surface-2 ">
 <tr>
 <th className="px-3 py-2 font-semibold text-text-muted ">#</th>
 <th className="px-3 py-2 font-semibold text-text-muted ">{t("common.email")}</th>
 <th className="px-3 py-2 font-semibold text-text-muted ">{t("admin.bulkEnroll.colName")}</th>
 <th className="px-3 py-2 font-semibold text-text-muted ">{t("admin.bulkEnroll.colPassword")}</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-border ">
 {parsed.map((row, i) => (
 <tr key={i} className="hover:bg-surface-2 ">
 <td className="px-3 py-1.5 text-text-subtle">{i + 1}</td>
 <td className="px-3 py-1.5 font-mono text-text ">{row.email}</td>
 <td className="px-3 py-1.5 text-ink-700 ">{row.full_name || <span className="italic text-text-subtle">{t("admin.bulkEnroll.autoLabel")}</span>}</td>
 <td className="px-3 py-1.5 text-text-muted">{row.password ? "***" : <span className="italic text-text-subtle">{mode === "enroll" ? t("admin.bulkEnroll.defaultLabel") : t("admin.bulkEnroll.randomLabel")}</span>}</td>
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
 {t("admin.bulkEnroll.defaultPassword")}
 </CardTitle>
 </CardHeader>
 <CardContent>
 <input
 type="text"
 value={defaultPassword}
 onChange={(e) => setDefaultPassword(e.target.value)}
 placeholder="Welcome2026!"
 className="w-full rounded-lg border border-border-strong bg-paper-2 px-3 py-2 text-sm text-text "
 />
 <p className="mt-1 text-xs text-text-muted ">
 {t("admin.bulkEnroll.defaultPasswordHint")}
 </p>
 </CardContent>
 </Card>
 )}

 {/* Parental consent attestation */}
 {parsed.length > 0 && (
 <label className="mb-4 flex items-start gap-3 rounded-lg border border-border-strong bg-surface-2 px-4 py-3">
 <input
 type="checkbox"
 checked={parentalConsent}
 onChange={(e) => setParentalConsent(e.target.checked)}
 className="mt-0.5 h-4 w-4 rounded border-border-strong"
 />
 <span className="text-sm text-text">
 {t("admin.bulkEnroll.parentalConsentLabel")}
 </span>
 </label>
 )}

 {/* Submit button */}
 {mode === "enroll" ? (
 <Button
 onClick={handleSubmitEnroll}
 disabled={submitting || !courseId || parsed.length === 0}
 className="w-full"
 >
 {submitting
 ? t("admin.bulkEnroll.importing")
 : t("admin.bulkEnroll.importAndEnroll").replace("{n}", String(parsed.length))}
 </Button>
 ) : (
 <Button
 onClick={handleSubmitImport}
 disabled={submitting || parsed.length === 0}
 className="w-full"
 >
 {submitting
 ? t("admin.bulkEnroll.importing")
 : t("admin.bulkEnroll.importStudents").replace("{n}", String(parsed.length))}
 </Button>
 )}

 {/* Enroll Results */}
 {enrollResult && (
 <Card className="mt-6">
 <CardHeader>
 <CardTitle className="flex items-center gap-2 text-base">
 <CheckCircle className="h-4 w-4 text-primary" />
 {t("admin.bulkEnroll.importResults")}
 </CardTitle>
 </CardHeader>
 <CardContent>
 <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
 <Stat label={t("admin.bulkEnroll.statTotal")} value={enrollResult.total} />
 <Stat label={t("admin.bulkEnroll.statCreated")} value={enrollResult.created} />
 <Stat label={t("admin.bulkEnroll.statReused")} value={enrollResult.reused} />
 <Stat label={t("admin.bulkEnroll.statEnrolled")} value={enrollResult.enrolled} />
 </div>
 {enrollResult.already_enrolled > 0 && (
 <p className="mb-3 text-xs text-text-muted">
 {(enrollResult.already_enrolled === 1
 ? t("admin.bulkEnroll.alreadyEnrolledOne")
 : t("admin.bulkEnroll.alreadyEnrolledMany")
 ).replace("{n}", String(enrollResult.already_enrolled))}
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
 <CheckCircle className="h-4 w-4 text-primary" />
 {t("admin.bulkEnroll.importResults")}
 </CardTitle>
 </CardHeader>
 <CardContent>
 <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
 <Stat label={t("admin.bulkEnroll.statCreated")} value={importResult.created} />
 <Stat label={t("admin.bulkEnroll.statSkipped")} value={importResult.skipped} />
 <Stat label={t("admin.bulkEnroll.statErrors")} value={importResult.errors.length} />
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
 <div className="rounded-lg border border-border-strong bg-paper-2 p-3 text-center ">
 <div className="text-2xl font-bold text-text ">{value}</div>
 <div className="text-xs text-text-muted ">{label}</div>
 </div>
 );
}

function ErrorList({ errors }: { errors: string[] }) {
 return (
 <div>
 <p className="mb-2 text-sm font-semibold text-danger-fg ">
 {/* errorsLabel is generic - just show label */}
 Errors ({errors.length})
 </p>
 <div className="max-h-48 overflow-y-auto rounded-lg border border-danger bg-danger-soft p-3 ">
 {errors.map((err, i) => (
 <div key={i} className="mb-1 text-xs text-danger-fg ">
 {err}
 </div>
 ))}
 </div>
 </div>
 );
}
