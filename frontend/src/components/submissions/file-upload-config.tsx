"use client";

import { useState } from "react";
import apiClient from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Save, CheckCircle, Upload } from "lucide-react";
import { toast } from "sonner";

interface FileUploadConfigProps {
  courseId: string;
  moduleId: string;
  lessonId: string;
  initialContent: Record<string, unknown>;
  onSaved?: () => void;
}

const FILE_TYPE_GROUPS = [
  { label: "Images (.png, .jpg, .jpeg, .gif)", types: [".png", ".jpg", ".jpeg", ".gif"] },
  { label: "PDF (.pdf)", types: [".pdf"] },
  { label: "Documents (.doc, .docx)", types: [".doc", ".docx"] },
  { label: "Presentations (.pptx, .ppt)", types: [".pptx", ".ppt"] },
];

export default function FileUploadConfig({
  courseId,
  moduleId,
  lessonId,
  initialContent,
  onSaved,
}: FileUploadConfigProps) {
  const [instructions, setInstructions] = useState(
    (initialContent.instructions as string) || ""
  );
  const [allowedTypes, setAllowedTypes] = useState<string[]>(
    (initialContent.allowed_types as string[]) || [".pdf", ".png", ".jpg", ".jpeg", ".doc", ".docx", ".pptx"]
  );
  const [maxFileMb, setMaxFileMb] = useState(
    (initialContent.max_file_mb as number) || 10
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const toggleGroup = (types: string[]) => {
    const allPresent = types.every((t) => allowedTypes.includes(t));
    if (allPresent) {
      setAllowedTypes(allowedTypes.filter((t) => !types.includes(t)));
    } else {
      setAllowedTypes([...new Set([...allowedTypes, ...types])]);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await apiClient.put(
        `/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}/`,
        {
          content: {
            instructions,
            allowed_types: allowedTypes,
            max_file_mb: maxFileMb,
          },
        }
      );
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      if (onSaved) onSaved();
      toast.success("Configuration saved");
    } catch {
      toast.error("Failed to save configuration");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
        <Upload className="h-4 w-4 text-indigo-500" />
        File Upload Configuration
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">
          Instructions for students
        </label>
        <textarea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder="Upload your completed assignment as a PDF..."
          rows={3}
          className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
        />
      </div>

      <div>
        <label className="mb-2 block text-xs font-medium text-slate-600">
          Allowed file types
        </label>
        <div className="space-y-2">
          {FILE_TYPE_GROUPS.map((group) => (
            <label key={group.label} className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={group.types.every((t) => allowedTypes.includes(t))}
                onChange={() => toggleGroup(group.types)}
                className="rounded border-slate-300"
              />
              {group.label}
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">
          Max file size (MB)
        </label>
        <input
          type="number"
          value={maxFileMb}
          onChange={(e) => setMaxFileMb(parseInt(e.target.value) || 10)}
          min={1}
          max={50}
          className="w-32 rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
        />
      </div>

      <div className="flex items-center gap-3">
        <Button size="sm" onClick={handleSave} disabled={saving}>
          <Save className="mr-1 h-3 w-3" />
          {saving ? "Saving..." : "Save Config"}
        </Button>
        {saved && (
          <span className="flex items-center gap-1 text-xs font-medium text-emerald-600">
            <CheckCircle className="h-3 w-3" />
            Saved!
          </span>
        )}
      </div>
    </div>
  );
}
