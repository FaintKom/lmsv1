"use client";

import { useTranslation } from "@/lib/i18n/context";

/**
 * What a widget shows when its query fails.
 *
 * Every widget used to print `(error as Error).message`, so a teacher who
 * opened the dashboard by URL read "Request failed with status code 403" in
 * two tiles — a sentence written for a developer, about a decision the reader
 * cannot change (specs/066). The page above now refuses as a whole; this is
 * for the ordinary failures that remain.
 */
export function WidgetError() {
  const { t } = useTranslation();
  return <div className="text-sm text-text-muted">{t("analytics.widget.loadFailed")}</div>;
}
