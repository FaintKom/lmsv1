"use client";

import { useState, useCallback, useEffect, useRef, Suspense } from "react";
import { Loader2 } from "lucide-react";
import { MATH_TEMPLATES } from "./template-registry";

interface MathExerciseProps {
  exerciseId: string;
  config: Record<string, unknown>;
  onSubmit: (result: {
    completed: boolean;
    score: number;
    steps_used: number;
    time_seconds: number;
    code_snapshot: string | null;
  }) => void;
}

export default function MathExercise({
  exerciseId,
  config,
  onSubmit,
}: MathExerciseProps) {
  const templateType = (config.template_type as string) || "coordinate_plane";
  const customHtml = config.custom_html as string | undefined;
  const instructions = (config.instructions as string) || "";
  const templateConfig = (config.template_config as Record<string, unknown>) || config;

  const startTimeRef = useRef(Date.now());
  const [submitted, setSubmitted] = useState(false);

  const handleComplete = useCallback(
    (success: boolean, score: number) => {
      if (submitted) return;
      setSubmitted(true);
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      onSubmit({
        completed: success,
        score,
        steps_used: 0,
        time_seconds: elapsed,
        code_snapshot: null,
      });
    },
    [onSubmit, submitted]
  );

  // Custom HTML mode
  if (templateType === "custom_html" || customHtml) {
    return (
      <div className="space-y-3">
        {instructions && (
          <p className="text-sm text-slate-600 dark:text-slate-300 px-1">{instructions}</p>
        )}
        <HtmlSandbox html={customHtml || ""} onResult={handleComplete} />
      </div>
    );
  }

  // Template mode
  const template = MATH_TEMPLATES[templateType];
  if (!template || !template.component) {
    return (
      <div className="py-8 text-center text-sm text-slate-500">
        Unknown template type: {templateType}
      </div>
    );
  }

  const TemplateComponent = template.component;

  return (
    <div className="space-y-3">
      {instructions && (
        <p className="text-sm text-slate-600 dark:text-slate-300 px-1">{instructions}</p>
      )}
      <Suspense
        fallback={
          <div className="flex items-center justify-center py-12 text-sm text-slate-500">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading...
          </div>
        }
      >
        <TemplateComponent config={templateConfig} onComplete={handleComplete} />
      </Suspense>
    </div>
  );
}

/** Sandboxed iframe for custom HTML math exercises */
function HtmlSandbox({
  html,
  onResult,
}: {
  html: string;
  onResult: (success: boolean, score: number) => void;
}) {
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === "lms-exercise-result") {
        const { score, passed } = e.data.payload;
        onResult(passed, score);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [onResult]);

  const bridgeScript = `
    <script>
      window.LMS = {
        reportResult: function(result) {
          window.parent.postMessage({
            type: 'lms-exercise-result',
            payload: {
              score: result.score || 0,
              passed: !!result.passed,
              data: result.data || null
            }
          }, '*');
        }
      };
      window.addEventListener('message', function(e) {
        if (e.data && e.data.type === 'lms-exercise-init') {
          window.LMS.config = e.data.payload.config || {};
          window.LMS.darkMode = e.data.payload.darkMode || false;
        }
      });
    </script>
  `;

  const srcdoc = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>body { font-family: system-ui, sans-serif; margin: 16px; }</style>
  ${bridgeScript}
</head>
<body>
${html}
</body>
</html>`;

  return (
    <iframe
      srcDoc={srcdoc}
      sandbox="allow-scripts"
      className="h-[400px] w-full rounded-lg border border-slate-200 dark:border-white/10"
      title="Math Exercise"
    />
  );
}
