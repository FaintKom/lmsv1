"use client";

/**
 * ThemeToggle — Light / Dark / System, per the theme contract in
 * `frontend/design/README.md`: the choice lives in
 * localStorage["lms.theme"] and only toggles `.dark` on <html>. Components
 * never branch on theme; the tokens in globals.css flip.
 *
 * The same resolve expression runs in the no-FOUC script in the root
 * layout — keep the two in sync.
 */

import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";

import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/context";

type ThemeChoice = "light" | "dark" | "system";

const STORAGE_KEY = "lms.theme";

function prefersDark(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
}

function apply(choice: ThemeChoice) {
  if (typeof document === "undefined") return;
  const dark = choice === "dark" || (choice === "system" && prefersDark());
  document.documentElement.classList.toggle("dark", dark);
}

export function ThemeToggle({ className }: { className?: string }) {
  const { t } = useTranslation();
  // Server render and first client render must agree — read storage in an
  // effect, not during render. Default matches the no-FOUC script in the
  // root layout.
  const [choice, setChoice] = useState<ThemeChoice>("system");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY) as ThemeChoice | null;
    if (stored === "light" || stored === "dark" || stored === "system") {
      setChoice(stored);
    }
  }, []);

  // Follow the OS while the choice is "system".
  useEffect(() => {
    if (choice !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => apply("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [choice]);

  const pick = (next: ThemeChoice) => {
    setChoice(next);
    window.localStorage.setItem(STORAGE_KEY, next);
    apply(next);
  };

  const options: { value: ThemeChoice; label: string; Icon: typeof Sun }[] = [
    { value: "light", label: t("profile.themeLight"), Icon: Sun },
    { value: "dark", label: t("profile.themeDark"), Icon: Moon },
    { value: "system", label: t("profile.themeSystem"), Icon: Monitor },
  ];

  return (
    <div
      role="radiogroup"
      aria-label={t("profile.theme")}
      className={cn(
        "inline-flex items-center gap-1 rounded-pill border border-border bg-surface-2 p-1",
        className,
      )}
    >
      {options.map(({ value, label, Icon }) => {
        const active = choice === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => pick(value)}
            className={cn(
              "inline-flex min-h-[36px] items-center gap-1.5 rounded-pill px-3 py-1.5 text-sm font-semibold transition-colors",
              active
                ? "bg-surface text-text shadow-xs"
                : "text-text-muted hover:text-text",
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        );
      })}
    </div>
  );
}
