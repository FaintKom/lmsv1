"use client";

import { useEffect, useState, useRef } from "react";
import apiClient from "@/lib/api-client";
import { Upload, FileText, Download, Trash2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FileSubmission } from "@/types/api";

interface FileUploaderProps {
  lessonId: string;
  content: Record<string, unknown>;
  onComplete?: () => void;
}

export default function FileUploader({ lessonId, content, onComplete }: FileUploaderProps) {
  const [files, setFiles] = useState<FileSubmission[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const instructions = (content.instructions as string) || "";
  const allowedTypes = (content.allowed_types as string[]) || [];
  const maxFileMb = (content.max_file_mb as number) || 10;

  useEffect(() => {
    apiClient
      .get(`/submissions/lessons/${lessonId}/files/`)
      .then(({ data }) => setFiles(data))
      .catch(() => {});
  }, [lessonId]);

  const validateFile = (file: File): string | null => {
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (allowedTypes.length && !allowedTypes.includes(ext)) {
      return `File type ${ext} is not allowed. Allowed: ${allowedTypes.join(", ")}`;
    }
    if (file.size > maxFileMb * 1024 * 1024) {
      return `File too large. Maximum ${maxFileMb} MB.`;
    }
    return null;
  };

  const handleUpload = async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError("");
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const { data } = await apiClient.post(
        `/submissions/lessons/${lessonId}/upload/`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      setFiles([data, ...files]);
      if (onComplete) onComplete();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Upload failed";
      setError(msg);
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
    e.target.value = "";
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      {/* Instructions */}
      {instructions && (
        <div className="rounded-lg border border-ink-200 bg-white p-4">
          <p className="text-sm text-ink-700">{instructions}</p>
        </div>
      )}

      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
          dragOver
            ? "border-green-400 bg-green-50"
            : "border-ink-300 hover:border-green-300 hover:bg-ink-50"
        }`}
        onClick={() => inputRef.current?.click()}
      >
        <Upload className={`mx-auto mb-3 h-10 w-10 ${dragOver ? "text-green-500" : "text-ink-400"}`} />
        <p className="text-sm font-medium text-ink-700">
          {uploading ? "Uploading..." : "Drop file here or click to browse"}
        </p>
        <p className="mt-1 text-xs text-ink-400">
          Allowed: {allowedTypes.join(", ") || "All"} · Max {maxFileMb} MB
        </p>
        <input
          ref={inputRef}
          type="file"
          onChange={handleFileSelect}
          accept={allowedTypes.join(",")}
          className="hidden"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-coral-50 px-4 py-2 text-sm text-coral-500">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Uploaded files */}
      {files.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-ink-700">Uploaded Files</h4>
          {files.map((f) => (
            <div
              key={f.id}
              className="flex items-center gap-3 rounded-lg border border-ink-200 bg-white px-4 py-3"
            >
              <FileText className="h-5 w-5 text-ink-400" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink-700">
                  {f.original_filename}
                </p>
                <p className="text-xs text-ink-400">
                  {formatSize(f.file_size)} · {new Date(f.created_at).toLocaleString()}
                </p>
              </div>
              <a
                href={`/api/v1/submissions/files/${f.id}/download/`}
                className="rounded p-1.5 text-ink-400 hover:bg-green-50 hover:text-green-600"
                title="Download"
              >
                <Download className="h-4 w-4" />
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
