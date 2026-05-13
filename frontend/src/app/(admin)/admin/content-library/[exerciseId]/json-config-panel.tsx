"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import { AlertTriangle, Check, Code2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface JsonConfigPanelProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

export default function JsonConfigPanel({ config, onChange }: JsonConfigPanelProps) {
  const [internalText, setInternalText] = useState(() =>
    JSON.stringify(config, null, 2)
  );
  const [parseError, setParseError] = useState<string | null>(null);
  const isExternalUpdate = useRef(false);
  const lastAppliedJson = useRef(JSON.stringify(config));

  useEffect(() => {
    const incoming = JSON.stringify(config);
    if (incoming !== lastAppliedJson.current) {
      isExternalUpdate.current = true;
      const pretty = JSON.stringify(config, null, 2);
      setInternalText(pretty);
      lastAppliedJson.current = incoming;
      setParseError(null);
    }
  }, [config]);

  const handleEditorChange = useCallback(
    (value: string | undefined) => {
      if (isExternalUpdate.current) {
        isExternalUpdate.current = false;
        return;
      }
      const text = value ?? "";
      setInternalText(text);

      try {
        const parsed = JSON.parse(text);
        if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
          setParseError(null);
          lastAppliedJson.current = JSON.stringify(parsed);
          onChange(parsed);
        } else {
          setParseError("Root must be an object");
        }
      } catch (e) {
        setParseError((e as Error).message);
      }
    },
    [onChange]
  );

  const handleEditorMount: OnMount = (editor, monaco) => {
    monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
      validate: true,
      allowComments: false,
      trailingCommas: "error",
    });
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(internalText);
    toast.success("JSON copied");
  };

  const handleFormat = () => {
    try {
      const parsed = JSON.parse(internalText);
      const pretty = JSON.stringify(parsed, null, 2);
      setInternalText(pretty);
      setParseError(null);
    } catch {
      // can't format invalid JSON
    }
  };

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between border-b border-border px-3 py-2 bg-surface-2 rounded-t-lg">
        <div className="flex items-center gap-2">
          <Code2 className="h-4 w-4 text-text-muted" />
          <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
            JSON Config
          </span>
        </div>
        <div className="flex items-center gap-1">
          {parseError ? (
            <span className="flex items-center gap-1 text-xs text-danger-fg mr-2">
              <AlertTriangle className="h-3.5 w-3.5" />
              Invalid
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-primary mr-2">
              <Check className="h-3.5 w-3.5" />
              Valid
            </span>
          )}
          <Button variant="ghost" size="sm" onClick={handleFormat} title="Format">
            <Code2 className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" onClick={handleCopy} title="Copy">
            <Copy className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {parseError && (
        <div className="px-3 py-1.5 bg-danger-soft text-danger-fg text-xs font-mono truncate">
          {parseError}
        </div>
      )}

      <div className="rounded-b-lg overflow-hidden">
        <Editor
          height="500px"
          language="json"
          value={internalText}
          onChange={handleEditorChange}
          onMount={handleEditorMount}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            wordWrap: "on",
            tabSize: 2,
            automaticLayout: true,
            formatOnPaste: true,
            bracketPairColorization: { enabled: true },
          }}
        />
      </div>
    </div>
  );
}
