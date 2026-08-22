"use client";

import { useState } from "react";
import { AlertTriangle, BookOpen, CheckCircle2, Flame, Moon, Sun, Users } from "lucide-react";

import { contrastRatio, readableAs, readableOn, tooClose } from "@/lib/brand/contrast";
import { useTranslation } from "@/lib/i18n/context";

/**
 * What the school's colours will look like, before anything is saved.
 *
 * Two colours in, samples out. No org id, no network, no save — if this
 * component ever needs any of those, the boundary was drawn in the wrong place.
 *
 * The samples are drawn with explicit values rather than by re-theming real
 * components. A preview is a mock-up: keeping it off the token cascade is what
 * lets it show unsaved colours without touching the page around it.
 */

const SURFACE = {
  light: { page: "#ffffff", panel: "#f7f7f4", text: "#1a1a18", muted: "#6b6b66" },
  dark: { page: "#0b100c", panel: "#171f19", text: "#f0f0ec", muted: "#a8a8a2" },
};

const BARS = [72, 45, 88, 60, 94];

/** A wash of `hex` over `toward`, for badge backgrounds. */
function mix(hex: string, toward: string, amount: number) {
  const parse = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [a, b] = [parse(hex), parse(toward)];
  return `#${a
    .map((v, i) =>
      Math.round(v + (b[i] - v) * amount)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

export function BrandPreview({ primary, secondary }: { primary: string; secondary: string }) {
  const { t } = useTranslation();
  // Opens in whichever theme the admin is already sitting in. Showing them the
  // light samples while their own interface is dark answers a question they did
  // not ask; the toggle is there for when they do want the other one.
  const [dark, setDark] = useState(
    () => typeof document !== "undefined" && document.documentElement.classList.contains("dark"),
  );

  const skin = dark ? SURFACE.dark : SURFACE.light;
  const onFill = readableOn(primary);
  const fillRatio = contrastRatio(primary, onFill);
  const linkColor = readableAs(primary, skin.page);
  const merged = tooClose(primary, secondary);

  // Against the tint they actually sit on, not against the page. Computing
  // these against the page was off by exactly the tint: 4.02:1 where 4.5 was
  // needed, which the dark-theme audit caught and no unit test would have.
  const primaryTint = mix(primary, skin.page, 0.86);
  const secondaryTint = mix(secondary, skin.page, 0.86);
  const onPrimaryTint = readableAs(primary, primaryTint);
  const onSecondaryTint = readableAs(secondary, secondaryTint);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs text-text-subtle">{t("admin.settings.previewHint")}</p>
        <button
          type="button"
          onClick={() => setDark((d) => !d)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border-strong px-2.5 py-1.5 text-xs font-medium text-text hover:bg-surface-2"
        >
          {dark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
          {dark ? t("admin.settings.previewLight") : t("admin.settings.previewDark")}
        </button>
      </div>

      <div
        data-testid="brand-preview-stage"
        className="space-y-4 rounded-lg border border-border-strong p-5"
        style={{ background: skin.page, color: skin.text }}
      >
        <div className="flex flex-wrap items-center gap-3">
          <span
            data-testid="preview-cta"
            className="rounded-lg px-4 py-2 text-sm font-semibold"
            style={{ background: primary, color: onFill }}
          >
            {t("admin.settings.previewCta")}
          </span>
          <span className="text-sm font-medium" style={{ color: linkColor }}>
            {t("admin.settings.previewLink")}
          </span>
          <span
            className="rounded-lg px-2.5 py-1 text-xs font-semibold"
            style={{ background: primaryTint, color: onPrimaryTint }}
          >
            {t("admin.settings.previewBadge")}
          </span>
          <span
            data-testid="preview-streak"
            className="inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-xs font-semibold"
            style={{ background: secondaryTint, color: onSecondaryTint }}
          >
            <Flame className="h-3.5 w-3.5" />
            {t("admin.settings.previewStreak")}
          </span>
        </div>

        <div className="grid gap-5 sm:grid-cols-[minmax(0,180px)_minmax(0,1fr)]">
          <div className="space-y-0.5">
            <div
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-semibold"
              style={{ background: primary, color: onFill }}
            >
              <BookOpen className="h-4 w-4" />
              {t("admin.settings.previewNavActive")}
            </div>
            <div
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm"
              style={{ color: skin.muted }}
            >
              <Users className="h-4 w-4" />
              {t("admin.settings.previewNavIdle")}
            </div>
          </div>

          <div>
            <div className="flex h-20 items-end gap-2">
              {BARS.map((value, i) => (
                <div key={i} className="flex h-full flex-1 flex-col justify-end gap-0.5">
                  <div
                    style={{ background: primary, height: `${Math.round(value * 0.62)}%` }}
                    className="rounded-t-sm"
                  />
                  <div
                    data-testid={i === 0 ? "preview-series-secondary" : undefined}
                    style={{ background: secondary, height: `${Math.round(value * 0.3)}%` }}
                    className="rounded-b-sm"
                  />
                </div>
              ))}
            </div>
            <div className="mt-2 flex gap-3 text-xs" style={{ color: skin.muted }}>
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-sm" style={{ background: primary }} />
                {t("admin.settings.previewSeriesDone")}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="inline-block h-2 w-2 rounded-sm"
                  style={{ background: secondary }}
                />
                {t("admin.settings.previewSeriesActive")}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Warnings, never blockers. The school's colour is the school's call —
          what it must not be is a surprise. */}
      <div className="mt-3 space-y-2">
        {fillRatio < 4.5 ? (
          <p
            role="status"
            data-testid="preview-contrast-warning"
            className="flex items-start gap-2 rounded-lg bg-danger-soft px-3 py-2 text-xs text-danger-fg"
          >
            <AlertTriangle className="mt-px h-4 w-4 shrink-0" />
            <span>
              {t("admin.settings.previewContrastFail")} {fillRatio.toFixed(2)}:1
            </span>
          </p>
        ) : (
          <p className="flex items-start gap-2 text-xs text-text-subtle">
            <CheckCircle2 className="mt-px h-4 w-4 shrink-0 text-success-fg" />
            <span>
              {t("admin.settings.previewContrastOk")} {fillRatio.toFixed(2)}:1
            </span>
          </p>
        )}

        {merged && (
          <p
            role="status"
            data-testid="preview-merge-warning"
            className="flex items-start gap-2 rounded-lg bg-warning-soft px-3 py-2 text-xs text-warning-fg"
          >
            <AlertTriangle className="mt-px h-4 w-4 shrink-0" />
            {t("admin.settings.previewTooClose")}
          </p>
        )}
      </div>
    </div>
  );
}
