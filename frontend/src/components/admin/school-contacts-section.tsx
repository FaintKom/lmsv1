"use client";

import { useTranslation } from "@/lib/i18n/context";

/**
 * The things a school owns that are neither its colours nor its menu: the icon
 * in the browser tab, and where "Support" should send its pupils.
 *
 * Controlled, like the brand section above it. Leave the contact empty and the
 * product keeps answering support itself, which is the right default for a
 * school that has not decided to.
 */

const FIELD =
  "w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-soft";

export interface SchoolContactsSectionProps {
  faviconUrl: string;
  onFaviconUrl: (value: string) => void;
  supportEmail: string;
  onSupportEmail: (value: string) => void;
  supportUrl: string;
  onSupportUrl: (value: string) => void;
}

export function SchoolContactsSection({
  faviconUrl,
  onFaviconUrl,
  supportEmail,
  onSupportEmail,
  supportUrl,
  onSupportUrl,
}: SchoolContactsSectionProps) {
  const { t } = useTranslation();

  return (
    <div className="rounded-lg border border-border-strong bg-surface">
      <div className="border-b border-border px-6 py-4">
        <h2 className="font-semibold text-text">{t("admin.settings.contactsTitle")}</h2>
        <p className="text-xs text-text-subtle">{t("admin.settings.contactsSubtitle")}</p>
      </div>

      <div className="space-y-5 p-6">
        <div>
          <label htmlFor="faviconUrl" className="mb-1 block text-sm font-medium text-text">
            {t("admin.settings.faviconUrl")}
          </label>
          <div className="flex items-center gap-3">
            <input
              id="faviconUrl"
              type="url"
              value={faviconUrl}
              onChange={(e) => onFaviconUrl(e.target.value)}
              placeholder="https://example.com/icon.png"
              className={FIELD}
            />
            {faviconUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={faviconUrl}
                alt={t("admin.settings.faviconPreview")}
                className="h-8 w-8 shrink-0 rounded border border-border-strong object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            )}
          </div>
          <p className="mt-1 text-xs text-text-subtle">{t("admin.settings.faviconUrlHint")}</p>
        </div>

        <div>
          <label htmlFor="supportEmail" className="mb-1 block text-sm font-medium text-text">
            {t("admin.settings.supportEmail")}
          </label>
          <input
            id="supportEmail"
            type="email"
            value={supportEmail}
            onChange={(e) => onSupportEmail(e.target.value)}
            placeholder="help@example.school"
            className={FIELD}
          />
        </div>

        <div>
          <label htmlFor="supportUrl" className="mb-1 block text-sm font-medium text-text">
            {t("admin.settings.supportUrl")}
          </label>
          <input
            id="supportUrl"
            type="url"
            value={supportUrl}
            onChange={(e) => onSupportUrl(e.target.value)}
            placeholder="https://example.school/help"
            className={FIELD}
          />
          <p className="mt-1 text-xs text-text-subtle">{t("admin.settings.supportHint")}</p>
        </div>
      </div>
    </div>
  );
}
