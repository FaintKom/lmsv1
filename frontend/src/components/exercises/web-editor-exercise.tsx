"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Code2, Eye, Play, Send, RotateCcw, Maximize2, Minimize2 } from "lucide-react";
import apiClient from "@/lib/api-client";
import { toast } from "sonner";

interface WebEditorConfig {
  description?: string;
  starter_html?: string;
  starter_css?: string;
  starter_js?: string;
  requirements?: string[];
}

interface WebEditorExerciseProps {
  exerciseId: string;
  config: WebEditorConfig;
  onSubmit: (body: Record<string, unknown>) => void;
}

type EditorTab = "html" | "css" | "js";

const TAB_LABELS: Record<EditorTab, { label: string; icon: string; lang: string }> = {
  html: { label: "HTML", icon: "🟧", lang: "html" },
  css: { label: "CSS", icon: "🟦", lang: "css" },
  js: { label: "JS", icon: "🟨", lang: "javascript" },
};

// Assemble full HTML doc from three parts
function buildPreviewDoc(html: string, css: string, js: string): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 16px; }
${css}
</style>
</head>
<body>
${html}
<script>
try {
${js}
} catch(e) {
  document.body.innerHTML += '<pre style="color:red;margin-top:1em;font-size:13px">' + e.message + '</pre>';
}
</script>
</body>
</html>`;
}

export default function WebEditorExercise({
  exerciseId,
  config,
  onSubmit,
}: WebEditorExerciseProps) {
  const [htmlCode, setHtmlCode] = useState(config.starter_html || "");
  const [cssCode, setCssCode] = useState(config.starter_css || "");
  const [jsCode, setJsCode] = useState(config.starter_js || "");
  const [activeTab, setActiveTab] = useState<EditorTab>("html");
  const [previewDoc, setPreviewDoc] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [MonacoEditor, setMonacoEditor] = useState<React.ComponentType<Record<string, unknown>> | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Load Monaco lazily
  useEffect(() => {
    import("@monaco-editor/react").then((mod) => {
      setMonacoEditor(() => mod.default);
    });
  }, []);

  // Dark mode detection
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const check = () =>
      setIsDark(document.documentElement.classList.contains("dark") || mq.matches);
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    mq.addEventListener("change", check);
    return () => {
      obs.disconnect();
      mq.removeEventListener("change", check);
    };
  }, []);

  // Debounced preview update
  const updatePreview = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPreviewDoc(buildPreviewDoc(htmlCode, cssCode, jsCode));
    }, 300);
  }, [htmlCode, cssCode, jsCode]);

  useEffect(() => {
    updatePreview();
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [updatePreview]);

  // Initial preview
  useEffect(() => {
    setPreviewDoc(buildPreviewDoc(htmlCode, cssCode, jsCode));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCodeChange = (value: string | undefined) => {
    const v = value || "";
    if (activeTab === "html") setHtmlCode(v);
    else if (activeTab === "css") setCssCode(v);
    else setJsCode(v);
  };

  const getCurrentCode = () => {
    if (activeTab === "html") return htmlCode;
    if (activeTab === "css") return cssCode;
    return jsCode;
  };

  const handleRunPreview = () => {
    setPreviewDoc(buildPreviewDoc(htmlCode, cssCode, jsCode));
  };

  const handleReset = () => {
    setHtmlCode(config.starter_html || "");
    setCssCode(config.starter_css || "");
    setJsCode(config.starter_js || "");
    setTimeout(() => {
      setPreviewDoc(
        buildPreviewDoc(
          config.starter_html || "",
          config.starter_css || "",
          config.starter_js || ""
        )
      );
    }, 50);
  };

  const handleSubmit = async () => {
    if (!htmlCode.trim() && !cssCode.trim() && !jsCode.trim()) {
      toast.error("Write some code before submitting");
      return;
    }
    setIsSubmitting(true);
    try {
      const { data } = await apiClient.post(`/exercises/${exerciseId}/submit`, {
        web_code: { html: htmlCode, css: cssCode, js: jsCode },
      });
      toast.success("Code submitted!");
      onSubmit({ _already_submitted: true, ...data });
    } catch {
      toast.error("Failed to submit");
    } finally {
      setIsSubmitting(false);
    }
  };

  const editorHeight = isExpanded ? "60vh" : "280px";
  const previewHeight = isExpanded ? "60vh" : "300px";

  return (
    <div className="space-y-4">
      {/* Description + requirements */}
      {config.description && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
          <p className="text-sm text-slate-700 dark:text-slate-300">{config.description}</p>
          {config.requirements && config.requirements.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
                Requirements
              </p>
              <ul className="space-y-1">
                {config.requirements.map((req, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-green-500 shrink-0" />
                    {req}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Main editor area */}
      <div
        className={`rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden bg-white dark:bg-[#1e1e1e] ${
          isExpanded ? "fixed inset-4 z-50 flex flex-col" : ""
        }`}
      >
        {/* Toolbar */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#252526] px-2">
          {/* Tabs */}
          <div className="flex">
            {(Object.keys(TAB_LABELS) as EditorTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold transition-colors relative ${
                  activeTab === tab
                    ? "text-slate-900 dark:text-white"
                    : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400"
                }`}
              >
                <span>{TAB_LABELS[tab].icon}</span>
                {TAB_LABELS[tab].label}
                {activeTab === tab && (
                  <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-green-500" />
                )}
              </button>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 py-1.5">
            <button
              onClick={handleRunPreview}
              className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-green-600 hover:bg-green-50 dark:hover:bg-green-500/10 transition-colors"
              title="Refresh preview"
            >
              <Play className="h-3.5 w-3.5" />
              Run
            </button>
            <button
              onClick={handleReset}
              className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
              title="Reset to starter code"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
              title={isExpanded ? "Exit fullscreen" : "Fullscreen"}
            >
              {isExpanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>

        {/* Editor + Preview split */}
        <div className={`${isExpanded ? "flex flex-1 overflow-hidden" : "md:flex"}`}>
          {/* Editor pane */}
          <div className={`${isExpanded ? "w-1/2" : "md:w-1/2"} border-r border-slate-200 dark:border-white/10`}>
            {MonacoEditor ? (
              <MonacoEditor
                height={editorHeight}
                language={TAB_LABELS[activeTab].lang}
                value={getCurrentCode()}
                onChange={handleCodeChange}
                theme={isDark ? "vs-dark" : "light"}
                options={{
                  minimap: { enabled: false },
                  fontSize: 13,
                  lineNumbers: "on" as const,
                  scrollBeyondLastLine: false,
                  wordWrap: "on" as const,
                  tabSize: 2,
                  automaticLayout: true,
                  padding: { top: 12 },
                  renderWhitespace: "none" as const,
                  bracketPairColorization: { enabled: true },
                }}
              />
            ) : (
              <div
                className="flex items-center justify-center text-sm text-slate-400"
                style={{ height: editorHeight }}
              >
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-green-600 border-t-transparent mr-2" />
                Loading editor...
              </div>
            )}
          </div>

          {/* Preview pane */}
          <div className={`${isExpanded ? "w-1/2 flex flex-col" : "md:w-1/2"}`}>
            <div className="flex items-center gap-2 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#252526] px-4 py-2">
              <Eye className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Preview</span>
            </div>
            <div className={`bg-white ${isExpanded ? "flex-1" : ""}`} style={isExpanded ? undefined : { height: previewHeight }}>
              <iframe
                srcDoc={previewDoc}
                sandbox="allow-scripts"
                className="w-full h-full border-0"
                title="Live preview"
                style={{ minHeight: isExpanded ? undefined : previewHeight }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Fullscreen backdrop */}
      {isExpanded && (
        <div
          className="fixed inset-0 z-40 bg-black/50"
          onClick={() => setIsExpanded(false)}
        />
      )}

      {/* Submit button */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-400 dark:text-slate-500">
          Your code runs entirely in the browser preview — safe and sandboxed.
        </p>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="flex items-center gap-2 rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          <Send className="h-4 w-4" />
          {isSubmitting ? "Submitting..." : "Submit"}
        </button>
      </div>
    </div>
  );
}
