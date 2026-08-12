"use client";

/**
 * The landing's code demo — a real task, run and graded on the server.
 *
 * The component it replaces posted to a route that does not exist and, when
 * that failed, rendered a simulated result. This one calls
 * /api/v1/sandbox/demo/check, which runs the submission in the same sandbox
 * students get and returns a verdict per test case. Expected values stay on
 * the server, so nothing here can mark itself correct.
 */

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Check, Loader2, Play, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n/context";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[190px] items-center justify-center rounded-lg bg-surface-2 text-sm text-text-subtle">
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
    </div>
  ),
});

type DemoLanguage = "python" | "javascript";

const LANGUAGES: { key: DemoLanguage; label: string }[] = [
  { key: "python", label: "Python" },
  { key: "javascript", label: "JavaScript" },
];

interface DemoTask {
  id: string;
  function_name: string;
  starters: Record<string, string>;
  test_names: string[];
}

interface TestResult {
  name: string;
  passed: boolean;
  expected: string;
  got: string;
}

export function CodeDemo() {
  const { t } = useTranslation();
  const [task, setTask] = useState<DemoTask | null>(null);
  const [language, setLanguage] = useState<DemoLanguage>("python");
  const [code, setCode] = useState("");
  const [results, setResults] = useState<TestResult[] | null>(null);
  const [allPassed, setAllPassed] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const [output, setOutput] = useState<string | null>(null);
  const [busy, setBusy] = useState<"run" | "check" | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/v1/sandbox/demo/tasks")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data: { tasks: DemoTask[] }) => {
        if (cancelled || !data.tasks?.length) return;
        const first = data.tasks[0];
        setTask(first);
        setCode(first.starters.python ?? "");
      })
      .catch(() => {
        /* The panel keeps its loading state; there is nothing to recover. */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const switchLanguage = useCallback(
    (next: DemoLanguage) => {
      setLanguage(next);
      setResults(null);
      setOutput(null);
      setRunError(null);
      if (task) setCode(task.starters[next] ?? "");
    },
    [task],
  );

  const run = useCallback(async () => {
    setBusy("run");
    setResults(null);
    setRunError(null);
    try {
      const res = await fetch("/api/v1/sandbox/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language, source_code: code }),
      });
      if (res.status === 429) {
        setRunError(t("landing.demo.tooMany"));
        return;
      }
      const data = await res.json();
      setOutput(data.stdout || data.stderr || "");
    } catch {
      setRunError(t("landing.demo.unreachable"));
    } finally {
      setBusy(null);
    }
  }, [code, language, t]);

  const check = useCallback(async () => {
    if (!task) return;
    setBusy("check");
    setOutput(null);
    setRunError(null);
    try {
      const res = await fetch("/api/v1/sandbox/demo/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_id: task.id, language, source_code: code }),
      });
      if (res.status === 429) {
        setRunError(t("landing.demo.tooMany"));
        return;
      }
      const data = await res.json();
      setResults(data.tests ?? []);
      setAllPassed(Boolean(data.all_passed));
      if (data.error) setRunError(data.error);
    } catch {
      setRunError(t("landing.demo.unreachable"));
    } finally {
      setBusy(null);
    }
  }, [code, language, task, t]);

  return (
    <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
      {/* Editor side */}
      <div className="rounded-xl border-2 border-border bg-surface p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex gap-1.5">
            {LANGUAGES.map((l) => (
              <button
                key={l.key}
                onClick={() => switchLanguage(l.key)}
                className={`rounded-pill px-3 py-1 text-xs font-bold transition-colors ${
                  language === l.key
                    ? "bg-primary text-primary-fg"
                    : "bg-surface-2 text-text-muted hover:text-text"
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
          <span className="font-mono text-3xs uppercase tracking-wide text-text-subtle">
            {t("landing.demo.serverNote")}
          </span>
        </div>

        <div className="overflow-hidden rounded-lg border border-border">
          <MonacoEditor
            height="190px"
            language={language}
            theme="vs-dark"
            value={code}
            onChange={(v) => setCode(v ?? "")}
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              scrollBeyondLastLine: false,
              lineNumbers: "on",
              padding: { top: 12, bottom: 12 },
              // The starter comment is longer than the panel; without this it
              // just disappears off the right edge on a first visit.
              wordWrap: "on",
            }}
          />
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <Button onClick={check} disabled={busy !== null || !task}>
            {busy === "check" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            {t("landing.demo.check")}
          </Button>
          <Button variant="outline" onClick={run} disabled={busy !== null}>
            {busy === "run" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            {t("landing.demo.run")}
          </Button>
        </div>
      </div>

      {/* Verdict side */}
      <div className="rounded-xl border-2 border-border bg-surface-2 p-4">
        <div className="eyebrow mb-2">{t("landing.demo.testsHeading")}</div>

        {!task && <p className="text-sm text-text-subtle">{t("landing.demo.loading")}</p>}

        {task && !results && output === null && !runError && (
          <ul className="flex flex-col gap-1.5">
            {task.test_names.map((name) => (
              <li
                key={name}
                className="flex items-center gap-2 rounded-md bg-surface p-2 font-mono text-xs text-text-muted"
              >
                <span className="h-2 w-2 rounded-pill bg-border-strong" />
                {name}
              </li>
            ))}
          </ul>
        )}

        {results && results.length > 0 && (
          <>
            <ul className="flex flex-col gap-1.5">
              {results.map((r) => (
                <li
                  key={r.name}
                  className={`rounded-md p-2 font-mono text-xs ${
                    r.passed ? "bg-success-soft text-success-fg" : "bg-danger-soft text-danger-fg"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {r.passed ? (
                      <Check className="h-3.5 w-3.5 shrink-0" />
                    ) : (
                      <X className="h-3.5 w-3.5 shrink-0" />
                    )}
                    <span className="min-w-0 flex-1 truncate">{r.name}</span>
                  </div>
                  {!r.passed && (
                    <div className="mt-1 pl-5 text-3xs">
                      {t("landing.demo.expected")} {r.expected} · {t("landing.demo.got")} {r.got}
                    </div>
                  )}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-sm font-bold text-text">
              {allPassed ? t("landing.demo.allPassed") : t("landing.demo.someFailed")}
            </p>
          </>
        )}

        {output !== null && (
          <pre className="mt-2 max-h-[220px] overflow-auto rounded-md bg-surface p-2 font-mono text-xs text-text">
            {output || t("landing.demo.noOutput")}
          </pre>
        )}

        {runError && (
          <pre className="mt-2 max-h-[160px] overflow-auto whitespace-pre-wrap rounded-md bg-danger-soft p-2 font-mono text-xs text-danger-fg">
            {runError}
          </pre>
        )}
      </div>
    </div>
  );
}
