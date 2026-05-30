"use client";

/**
 * TheoryConfig — teacher-side editor for a "theory" lesson block.
 * 3 steps: pick a source (PDF / PPTX / Google Slides) → upload the file or
 * paste the share link → fill title/notes and save. Persists the TheoryBlock
 * into the lesson's `content` JSON.
 *
 * Keynote (.key) is intentionally absent — it needs a paid server-side
 * conversion (see lib/theory.ts).
 */

import { useRef, useState } from "react";
import apiClient from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Save, CheckCircle, Upload, Link2, Presentation } from "lucide-react";
import { toast } from "sonner";
import { convertGSlidesUrl, type TheorySourceKind } from "@/lib/theory";
import { useTranslation } from "@/lib/i18n/context";

interface TheoryConfigProps {
  courseId: string;
  moduleId: string;
  lessonId: string;
  initialContent: Record<string, unknown>;
  onSaved?: () => void;
}

const SOURCES: { id: TheorySourceKind; label: string; subKey: string }[] = [
  { id: "pdf", label: "PDF", subKey: "theory.cfg.pdfSub" },
  { id: "pptx", label: "PowerPoint", subKey: "theory.cfg.pptxSub" },
  { id: "gslides", label: "Google Slides", subKey: "theory.cfg.gslidesSub" },
];

export default function TheoryConfig({
  courseId,
  moduleId,
  lessonId,
  initialContent,
  onSaved,
}: TheoryConfigProps) {
  const { t } = useTranslation();
  const existing = (initialContent.source as { kind?: TheorySourceKind; url?: string; filename?: string }) || {};
  const [kind, setKind] = useState<TheorySourceKind>(existing.kind || "pdf");
  const [url, setUrl] = useState(existing.url || "");
  const [filename, setFilename] = useState(existing.filename || "");
  const [title, setTitle] = useState((initialContent.title as string) || "");
  const [subtitle, setSubtitle] = useState((initialContent.subtitle as string) || "");
  const [notes, setNotes] = useState(
    ((initialContent.speaker_notes as string[]) || []).join("\n"),
  );
  const [shareLink, setShareLink] = useState(existing.kind === "gslides" ? existing.url || "" : "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const pickKind = (k: TheorySourceKind) => {
    setKind(k);
    setUrl("");
    setFilename("");
    setShareLink("");
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await apiClient.post("/courses/upload-theory", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setUrl(data.url);
      setFilename(data.filename || file.name);
      toast.success(t("theory.cfg.fileUploaded"));
    } catch {
      toast.error(t("theory.cfg.uploadFailed"));
    } finally {
      setUploading(false);
    }
  };

  const gslidesEmbed = kind === "gslides" ? convertGSlidesUrl(shareLink) : null;

  const handleConvert = () => {
    if (!gslidesEmbed) {
      toast.error(t("theory.cfg.notGSlides"));
      return;
    }
    setUrl(gslidesEmbed);
    setFilename("Google Slides deck");
    toast.success(t("theory.cfg.embedReady"));
  };

  const handleSave = async () => {
    if (!url) {
      toast.error(t("theory.cfg.addSourceFirst"));
      return;
    }
    setSaving(true);
    setSaved(false);
    try {
      const speaker_notes = notes
        .split("\n")
        .map((n) => n.trim())
        .filter(Boolean);
      await apiClient.put(`/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}/`, {
        content: {
          title,
          subtitle,
          source: { kind, url, filename },
          speaker_notes,
        },
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      onSaved?.();
      toast.success(t("theory.cfg.savedToast"));
    } catch {
      toast.error(t("theory.cfg.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const isFileSource = kind !== "gslides";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-ink-700">
        <Presentation className="h-4 w-4 text-primary" />
        {t("theory.cfg.header")}
      </div>

      {/* 1 · source */}
      <div>
        <label className="mb-2 block text-xs font-medium text-text-muted">1 · {t("theory.cfg.step1Source")}</label>
        <div className="grid grid-cols-3 gap-2">
          {SOURCES.map((s) => (
            <button
              key={s.id}
              onClick={() => pickKind(s.id)}
              className={`rounded-lg border-2 p-2.5 text-left transition-colors ${
                kind === s.id
                  ? "border-primary bg-success-soft"
                  : "border-border bg-paper-2 hover:border-ink-300"
              }`}
            >
              <div className="text-sm font-bold text-text">{s.label}</div>
              <div className="mt-0.5 text-[11px] leading-tight text-text-muted">{t(s.subKey)}</div>
            </button>
          ))}
        </div>
      </div>

      {/* 2 · upload or paste */}
      <div>
        <label className="mb-1 block text-xs font-medium text-text-muted">
          2 · {isFileSource ? t("theory.cfg.step2Upload") : t("theory.cfg.step2Paste")}
        </label>
        {isFileSource ? (
          <div
            onClick={() => fileRef.current?.click()}
            className={`cursor-pointer rounded-lg border-2 border-dashed p-5 text-center transition-colors ${
              url ? "border-primary bg-success-soft" : "border-ink-300 bg-paper-2 hover:border-primary"
            }`}
          >
            {url ? (
              <div className="text-sm font-semibold text-text">{filename || t("theory.cfg.uploaded")}</div>
            ) : (
              <div className="flex flex-col items-center gap-1 text-text-muted">
                <Upload className="h-5 w-5" />
                <span className="text-sm font-medium">
                  {uploading ? t("theory.cfg.uploading") : `${t("theory.cfg.clickUpload")} ${kind.toUpperCase()}`}
                </span>
                <span className="text-[11px]">{t("theory.cfg.maxSize")}</span>
              </div>
            )}
            <input
              ref={fileRef}
              type="file"
              accept={kind === "pdf" ? ".pdf" : ".pptx,.ppt"}
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleUpload(f);
              }}
            />
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              value={shareLink}
              onChange={(e) => setShareLink(e.target.value)}
              placeholder="https://docs.google.com/presentation/d/…/edit"
              className="flex-1 rounded-lg border border-ink-300 px-3 py-1.5 text-sm focus:border-primary focus:outline-none"
            />
            <Button size="sm" onClick={handleConvert} disabled={!gslidesEmbed}>
              <Link2 className="mr-1 h-3 w-3" />
              {t("theory.cfg.convert")}
            </Button>
          </div>
        )}
        {!isFileSource && url && (
          <div className="mt-2 break-all rounded-lg bg-success-soft px-3 py-2 font-mono text-[11px] text-primary">
            {url}
          </div>
        )}
      </div>

      {/* 3 · meta */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-text-muted">{t("theory.cfg.title")}</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Recursion · Stack frames"
            className="w-full rounded-lg border border-ink-300 px-3 py-1.5 text-sm focus:border-primary focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-text-muted">{t("theory.cfg.subtitle")}</label>
          <input
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            placeholder="How a function call unwinds"
            className="w-full rounded-lg border border-ink-300 px-3 py-1.5 text-sm focus:border-primary focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-text-muted">
          {t("theory.cfg.notes")}
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder={"Open with a relatable example.\nStress the base case."}
          className="w-full rounded-lg border border-ink-300 px-3 py-1.5 text-sm focus:border-primary focus:outline-none"
        />
      </div>

      <div className="flex items-center gap-3">
        <Button size="sm" onClick={handleSave} disabled={saving || uploading}>
          <Save className="mr-1 h-3 w-3" />
          {saving ? t("theory.cfg.saving") : t("theory.cfg.saveBtn")}
        </Button>
        {saved && (
          <span className="flex items-center gap-1 text-xs font-medium text-primary">
            <CheckCircle className="h-3 w-3" />
            {t("theory.cfg.savedBadge")}
          </span>
        )}
      </div>
    </div>
  );
}
