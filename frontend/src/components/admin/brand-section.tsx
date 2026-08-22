"use client";

import { suggestSecondary } from "@/lib/brand/contrast";
import { useTranslation } from "@/lib/i18n/context";

import { BrandPreview } from "./brand-preview";

/**
 * The school's mark and colours.
 *
 * Controlled throughout: the form above owns the values and the save, this owns
 * the layout and one rule — the second colour follows the first until the
 * school picks one deliberately, and never again after that.
 *
 * `secondaryIsCustom` is a stored flag rather than a comparison, because
 * "they chose this" and "this happens to equal what we suggested" are different
 * facts and only one of them should stop the colour from moving.
 */

const FIELD =
  "w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-soft";

const SWATCH = "w-28 rounded-lg border border-border-strong bg-surface px-3 py-2 font-mono text-sm focus:border-primary focus:outline-none";

export interface BrandSectionProps {
  displayName: string;
  onDisplayName: (value: string) => void;
  logoUrl: string;
  onLogoUrl: (value: string) => void;
  primary: string;
  secondary: string;
  secondaryIsCustom: boolean;
  onColors: (next: { primary: string; secondary: string; secondaryIsCustom: boolean }) => void;
}

export function BrandSection({
  displayName,
  onDisplayName,
  logoUrl,
  onLogoUrl,
  primary,
  secondary,
  secondaryIsCustom,
  onColors,
}: BrandSectionProps) {
  const { t } = useTranslation();
  const suggestions = suggestSecondary(primary);

  const setPrimary = (value: string) =>
    onColors({
      primary: value,
      // Untouched, so it keeps following. Touched, so it stays put — a school
      // that already has a brand pair should not have half of it rewritten
      // because they nudged the other half.
      secondary: secondaryIsCustom ? secondary : suggestSecondary(value)[0],
      secondaryIsCustom,
    });

  const setSecondary = (value: string) =>
    onColors({ primary, secondary: value, secondaryIsCustom: true });

  return (
    <div className="rounded-lg border border-border-strong bg-surface">
      <div className="border-b border-border px-6 py-4">
        <h2 className="font-semibold text-text">{t("admin.settings.brandingTitle")}</h2>
        <p className="text-xs text-text-subtle">{t("admin.settings.brandingSubtitle")}</p>
      </div>

      <div className="space-y-5 p-6">
        <div>
          <label htmlFor="displayName" className="mb-1 block text-sm font-medium text-text">
            {t("admin.settings.displayName")}
          </label>
          <input
            id="displayName"
            type="text"
            value={displayName}
            onChange={(e) => onDisplayName(e.target.value)}
            placeholder={t("admin.settings.displayNamePlaceholder")}
            className={FIELD}
          />
          <p className="mt-1 text-xs text-text-subtle">{t("admin.settings.displayNameHint")}</p>
        </div>

        <div>
          <label htmlFor="logoUrl" className="mb-1 block text-sm font-medium text-text">
            {t("admin.settings.logoUrl")}
          </label>
          <div className="flex items-center gap-3">
            <input
              id="logoUrl"
              type="url"
              value={logoUrl}
              onChange={(e) => onLogoUrl(e.target.value)}
              placeholder="https://example.com/logo.png"
              className={FIELD}
            />
            {logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt={t("admin.settings.logoPreview")}
                className="h-10 w-10 shrink-0 rounded-lg border border-border-strong object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            )}
          </div>
          <p className="mt-1 text-xs text-text-subtle">{t("admin.settings.logoUrlHint")}</p>
        </div>

        <div>
          <label htmlFor="primaryColor" className="mb-1 block text-sm font-medium text-text">
            {t("admin.settings.primaryColor")}
          </label>
          <div className="flex items-center gap-3">
            <input
              id="primaryColor"
              type="color"
              value={primary}
              onChange={(e) => setPrimary(e.target.value)}
              className="h-10 w-10 shrink-0 cursor-pointer rounded-lg border border-border-strong p-0.5"
            />
            <input
              type="text"
              value={primary}
              onChange={(e) => setPrimary(e.target.value)}
              aria-label={t("admin.settings.primaryColor")}
              className={SWATCH}
            />
          </div>
          <p className="mt-1 text-xs text-text-subtle">{t("admin.settings.primaryColorHint")}</p>
        </div>

        <div>
          <label htmlFor="secondaryColor" className="mb-1 block text-sm font-medium text-text">
            {t("admin.settings.secondaryColor")}
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <div
              className="flex gap-2"
              role="group"
              aria-label={t("admin.settings.secondarySuggested")}
            >
              {suggestions.map((hex) => (
                <button
                  key={hex}
                  type="button"
                  onClick={() => setSecondary(hex)}
                  aria-label={`${t("admin.settings.secondarySuggested")} ${hex}`}
                  aria-pressed={hex.toLowerCase() === secondary.toLowerCase()}
                  className={`h-8 w-8 cursor-pointer rounded-lg ${
                    hex.toLowerCase() === secondary.toLowerCase()
                      ? "ring-2 ring-text ring-offset-1"
                      : "border border-border-strong"
                  }`}
                  style={{ background: hex }}
                />
              ))}
            </div>
            <input
              id="secondaryColor"
              type="color"
              value={secondary}
              onChange={(e) => setSecondary(e.target.value)}
              className="h-10 w-10 shrink-0 cursor-pointer rounded-lg border border-border-strong p-0.5"
            />
            <input
              type="text"
              value={secondary}
              onChange={(e) => setSecondary(e.target.value)}
              aria-label={t("admin.settings.secondaryColor")}
              className={SWATCH}
            />
          </div>
          <p className="mt-1 text-xs text-text-subtle">
            {secondaryIsCustom
              ? t("admin.settings.secondaryColorHint")
              : t("admin.settings.secondaryFollows")}
          </p>
        </div>

        <div className="border-t border-border pt-5">
          <h3 className="mb-3 text-sm font-medium text-text">{t("admin.settings.previewTitle")}</h3>
          <BrandPreview primary={primary} secondary={secondary} />
        </div>
      </div>
    </div>
  );
}
