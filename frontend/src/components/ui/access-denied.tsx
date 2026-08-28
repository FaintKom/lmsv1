"use client";

import { Card, CardContent } from "@/components/ui/card";
import { useTranslation } from "@/lib/i18n/context";

/**
 * What a page shows when the server said no.
 *
 * The rule comes from specs/051 and was applied to /admin/users first: an
 * empty list is not an answer to "you may not see this". A swallowed 403 left
 * a teacher reading "0 users in your organization" about a school with seven
 * people in it — and still offered the button to add an eighth.
 *
 * Deliberately actionless. Offering a control the server will refuse is the
 * original mistake in a smaller font.
 *
 * Takes dictionary keys rather than finished strings, and translates them
 * here: the i18n ratchet reads whole files, so a component that renders text
 * without calling `useTranslation` fails the gate no matter where the words
 * came from.
 *
 * `pageTitleKey` names the page so the reader knows they arrived where they
 * meant to; `titleKey` and `reasonKey` say whose this is and who to ask —
 * per caller, because "ask the school administrator" and "this belongs to
 * GrassLMS" are different sentences.
 */
export function AccessDenied({
  pageTitleKey,
  titleKey,
  reasonKey,
}: {
  pageTitleKey: string;
  titleKey: string;
  reasonKey: string;
}) {
  const { t } = useTranslation();
  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="text-2xl font-bold text-text">{t(pageTitleKey)}</h1>
      <Card className="mt-6">
        <CardContent className="p-6">
          <p className="font-semibold text-text">{t(titleKey)}</p>
          <p className="mt-1 text-sm text-text-muted">{t(reasonKey)}</p>
        </CardContent>
      </Card>
    </div>
  );
}
