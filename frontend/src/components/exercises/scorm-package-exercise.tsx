"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Upload, Package, AlertCircle, CheckCircle2 } from "lucide-react";
import apiClient from "@/lib/api-client";
import { Button } from "@/components/ui/button";

// scorm-again types — kept loose so build does not break before the dep
// is installed. After `npm install --legacy-peer-deps`, the dynamic
// import in SCORMPackageRenderer resolves to the real classes.
type ScormAPI = {
 lmsInitialize?: () => string;
 lmsFinish?: () => string;
 lmsCommit?: () => string;
 terminate: (msg: string, finish: boolean) => string;
};
type ScormAgainModule = {
 Scorm12API: new (settings: Record<string, unknown>) => ScormAPI;
 Scorm2004API: new (settings: Record<string, unknown>) => ScormAPI;
};

interface SCORMPackage {
 id: string;
 title: string | null;
 format: "scorm12" | "scorm2004" | "xapi" | "aicc";
 launch_url: string | null;
 status: "pending" | "extracted" | "failed";
 error: string | null;
 original_filename: string | null;
}

interface SCORMConfig {
 package_id?: string;
 launch_url?: string;
 format?: string;
 title?: string;
}

// ─── Config Editor (teacher view, in /admin/content-library) ──────────

export function SCORMConfigEditor({
 config,
 onChange,
 exerciseId,
}: {
 config: Record<string, unknown>;
 onChange: (c: Record<string, unknown>) => void;
 exerciseId?: string;
}) {
 const cfg = config as SCORMConfig;
 const [uploading, setUploading] = useState(false);
 const [pkg, setPkg] = useState<SCORMPackage | null>(null);
 const fileInputRef = useRef<HTMLInputElement>(null);

 useEffect(() => {
 if (cfg.package_id) {
 apiClient
 .get<SCORMPackage>(`/scorm-import/packages/${cfg.package_id}`)
 .then(({ data }) => setPkg(data))
 .catch(() => setPkg(null));
 }
 }, [cfg.package_id]);

 const handleUpload = async (file: File) => {
 if (!file.name.toLowerCase().endsWith(".zip")) {
 toast.error("Upload a .zip exported from your authoring tool");
 return;
 }
 if (file.size > 100 * 1024 * 1024) {
 toast.error("Package must be under 100 MB");
 return;
 }
 setUploading(true);
 try {
 const fd = new FormData();
 fd.append("file", file);
 const params = exerciseId ? { exercise_id: exerciseId } : {};
 const { data } = await apiClient.post<SCORMPackage>(
 "/scorm-import/upload",
 fd,
 { params, headers: { "Content-Type": "multipart/form-data" } }
 );
 setPkg(data);
 onChange({
 ...config,
 package_id: data.id,
 launch_url: data.launch_url || "",
 format: data.format,
 title: data.title || "",
 });
 if (data.status === "extracted") {
 toast.success(`Imported "${data.title || data.original_filename}"`);
 } else {
 toast.error(`Import failed: ${data.error || "unknown error"}`);
 }
 } catch (e) {
 toast.error("Upload failed");
 // eslint-disable-next-line no-console
 console.error(e);
 } finally {
 setUploading(false);
 }
 };

 return (
 <div className="space-y-4">
 <div className="rounded-lg border border-border-strong bg-paper-2 p-4">
 <p className="mb-2 text-sm font-medium text-text">SCORM / xAPI Package</p>
 <p className="mb-3 text-xs text-text-muted">
 Upload a <strong>.zip</strong> exported from Articulate Storyline,
 Articulate Rise, iSpring Suite, Adobe Captivate, or any tool that
 produces SCORM 1.2 / SCORM 2004 / xAPI (Tin Can) output. Max 100 MB.
 </p>
 <input
 ref={fileInputRef}
 type="file"
 accept=".zip"
 disabled={uploading}
 className="hidden"
 onChange={(e) => {
 const f = e.target.files?.[0];
 if (f) void handleUpload(f);
 e.target.value = "";
 }}
 />
 <Button
 type="button"
 onClick={() => fileInputRef.current?.click()}
 disabled={uploading}
 variant={pkg ? "outline" : "default"}
 size="sm"
 >
 <Upload className="h-4 w-4" />
 {uploading ? "Uploading..." : pkg ? "Replace package" : "Upload .zip"}
 </Button>
 </div>

 {pkg && (
 <div
 className={`rounded-lg border p-4 ${
 pkg.status === "extracted"
 ? "border-success bg-success-soft"
 : pkg.status === "failed"
 ? "border-danger bg-danger-soft"
 : "border-border-strong bg-paper-2"
 }`}
 >
 <div className="flex items-start gap-2">
 {pkg.status === "extracted" ? (
 <CheckCircle2 className="mt-0.5 h-4 w-4 text-success-fg" />
 ) : pkg.status === "failed" ? (
 <AlertCircle className="mt-0.5 h-4 w-4 text-danger-fg" />
 ) : (
 <Package className="mt-0.5 h-4 w-4 text-text-muted" />
 )}
 <div className="flex-1 text-sm">
 <p className="font-medium text-text">
 {pkg.title || pkg.original_filename || "Imported package"}
 </p>
 <p className="text-xs text-text-muted">
 {pkg.format} · status: {pkg.status}
 {pkg.launch_url ? ` · launch: ${pkg.launch_url}` : ""}
 </p>
 {pkg.error && (
 <p className="mt-1 text-xs text-danger-fg">Error: {pkg.error}</p>
 )}
 </div>
 </div>
 </div>
 )}
 </div>
 );
}

// ─── Player (student view, embedded in lesson) ────────────────────────

export function SCORMPackageRenderer({
 exerciseId: _exerciseId,
 config,
 onSubmit,
}: {
 exerciseId: string;
 config: Record<string, unknown>;
 onSubmit: (body: Record<string, unknown>) => void;
}) {
 const cfg = config as SCORMConfig;
 const apiRef = useRef<ScormAPI | null>(null);

 useEffect(() => {
 if (!cfg.package_id) return;
 let cleaned = false;

 // scorm-again is added to package.json; the dynamic import is wrapped
 // in .catch() so it still degrades cleanly if the dep is missing.
 import("scorm-again")
 .then((mod: unknown) => {
 if (cleaned) return;
 const m = mod as ScormAgainModule;
 const fmt = cfg.format || "scorm12";
 const Ctor = fmt === "scorm2004" ? m.Scorm2004API : m.Scorm12API;
 const api = new Ctor({
 autocommit: true,
 autocommit_seconds: 30,
 logLevel: 3,
 lmsCommitUrl: `/api/v1/scorm-import/packages/${cfg.package_id}/statements`,
 sendBeaconCommit: false,
 alwaysSendTotalTime: true,
 });
 const w = window as unknown as { API?: ScormAPI; API_1484_11?: ScormAPI };
 w.API = api;
 w.API_1484_11 = api;
 apiRef.current = api;
 })
 .catch(() => {
 // scorm-again not installed yet; iframe still renders but CMI
 // tracking will be silent. Run `npm install scorm-again` to enable.
 // eslint-disable-next-line no-console
 console.warn("[scorm-again] dep not installed; running without CMI bridge");
 });

 return () => {
 cleaned = true;
 try {
 apiRef.current?.terminate("Terminate", true);
 } catch {
 // ignore
 }
 const w = window as unknown as { API?: ScormAPI; API_1484_11?: ScormAPI };
 delete w.API;
 delete w.API_1484_11;
 apiRef.current = null;
 };
 }, [cfg.package_id, cfg.format]);

 if (!cfg.package_id) {
 return (
 <div className="rounded-lg border border-border-strong bg-paper-2 p-6 text-center text-sm text-text-muted">
 No SCORM package uploaded yet. Ask your teacher to upload one.
 </div>
 );
 }
 if (!cfg.launch_url) {
 return (
 <div className="rounded-lg border border-danger bg-danger-soft p-6 text-center text-sm text-danger-fg">
 SCORM package has no launch entry. The .zip may be malformed
 (no imsmanifest.xml or no resource href).
 </div>
 );
 }

 const token = typeof window !== "undefined"
 ? localStorage.getItem("access_token") || localStorage.getItem("token") || ""
 : "";
 const sep = cfg.launch_url?.includes("?") ? "&" : "?";
 const src = `/api/v1/scorm-import/packages/${cfg.package_id}/files/${cfg.launch_url}${sep}token=${encodeURIComponent(token)}`;

 return (
 <div className="space-y-3">
 <iframe
 src={src}
 className="h-[600px] w-full rounded-lg border border-border-strong bg-paper-2"
 sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
 title={cfg.title || "SCORM content"}
 />
 <div className="flex justify-end">
 <Button
 size="sm"
 variant="outline"
 onClick={() =>
 onSubmit({
 interactive_answers: { scorm_finished: true, package_id: cfg.package_id },
 })
 }
 >
 Mark complete
 </Button>
 </div>
 </div>
 );
}
