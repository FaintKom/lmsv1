"use client";
/**
 * WidgetSettings — popover form bound to a widget instance's `props`.
 *
 * Reads field definitions from the registry (`meta.configFields`) and
 * builds a small form. Submitting calls `onSave(nextProps)` which the
 * dashboard-canvas wires into a PATCH /admin/dashboards/{id}.
 */
import { X } from "lucide-react";
import { useEffect, useState } from "react";

import { useAdminCourses } from "@/hooks/use-dashboards";

import type { ConfigField, WidgetMeta } from "./widget-registry";

interface Props {
  meta: WidgetMeta;
  currentProps: Record<string, unknown> | undefined;
  onSave: (nextProps: Record<string, unknown>) => void;
  onClose: () => void;
}

export function WidgetSettings({ meta, currentProps, onSave, onClose }: Props) {
  const [draft, setDraft] = useState<Record<string, unknown>>(
    () => currentProps ?? {},
  );

  useEffect(() => {
    setDraft(currentProps ?? {});
  }, [currentProps]);

  if (!meta.configFields || meta.configFields.length === 0) {
    return (
      <div className="absolute right-0 top-10 w-72 bg-paper-2 border border-border rounded-md shadow-lg z-30 p-3 text-sm text-text-muted">
        Nothing to configure for this widget.
        <button
          type="button"
          onClick={onClose}
          className="mt-3 w-full text-left text-primary"
        >
          Close
        </button>
      </div>
    );
  }

  const handleChange = (key: string, value: unknown) => {
    setDraft((prev) => {
      const next = { ...prev };
      if (value === "" || value === undefined || value === null) {
        delete next[key];
      } else {
        next[key] = value;
      }
      return next;
    });
  };

  return (
    <div
      className="absolute right-0 top-10 w-80 bg-paper-2 border border-border rounded-md shadow-lg z-30"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div className="text-sm font-semibold text-text">{meta.label} settings</div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 hover:bg-surface-2 rounded"
          aria-label="Close settings"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <form
        className="p-3 space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          onSave(draft);
          onClose();
        }}
      >
        {meta.configFields.map((field) => (
          <Field
            key={field.key}
            field={field}
            value={draft[field.key]}
            onChange={(v) => handleChange(field.key, v)}
          />
        ))}
        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-sm rounded hover:bg-surface-2"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-3 py-1.5 text-sm bg-primary text-white rounded hover:bg-primary/90"
          >
            Save
          </button>
        </div>
      </form>
    </div>
  );
}

interface FieldProps {
  field: ConfigField;
  value: unknown;
  onChange: (next: unknown) => void;
}

function Field({ field, value, onChange }: FieldProps) {
  return (
    <label className="block">
      <div className="text-xs font-medium text-text mb-1">{field.label}</div>
      {field.type === "course" ? (
        <CoursePicker
          value={(value as string | undefined) ?? ""}
          onChange={onChange}
        />
      ) : field.type === "number" ? (
        <input
          type="number"
          value={(value as number | undefined) ?? ""}
          placeholder={
            field.default !== undefined ? String(field.default) : undefined
          }
          min={field.min}
          max={field.max}
          onChange={(e) => {
            const v = e.target.value;
            onChange(v === "" ? undefined : Number(v));
          }}
          className="w-full px-2 py-1 text-sm bg-surface-2 border border-border rounded"
        />
      ) : (
        <input
          type="text"
          value={(value as string | undefined) ?? ""}
          onChange={(e) => onChange(e.target.value || undefined)}
          className="w-full px-2 py-1 text-sm bg-surface-2 border border-border rounded"
        />
      )}
      {field.help ? (
        <div className="text-xs text-text-muted mt-1">{field.help}</div>
      ) : null}
    </label>
  );
}

function CoursePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const { data: courses, isLoading } = useAdminCourses();

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-2 py-1 text-sm bg-surface-2 border border-border rounded"
      disabled={isLoading}
    >
      <option value="">— All courses —</option>
      {(courses ?? []).map((c) => (
        <option key={c.id} value={c.id}>
          {c.title}
        </option>
      ))}
    </select>
  );
}
