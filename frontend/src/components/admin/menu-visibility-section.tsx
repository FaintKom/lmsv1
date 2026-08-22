"use client";

import { HIDEABLE_ITEMS, MENU_GROUPS } from "@/components/layout/menu-items";
import { useTranslation } from "@/lib/i18n/context";

/**
 * Which menu entries this school hides.
 *
 * Controlled, like the brand and contacts sections above it: it is handed the
 * map and a way to flip one key, and it knows nothing about the school, the
 * network, or saving. The moment it needs an `orgId` the boundary is in the
 * wrong place.
 *
 * Both the rows and their categories come from the menu's own list, in the
 * menu's order, labelled with the menu's own strings. That is the whole point
 * — the settings screen used to keep a second list, and the two drifted six
 * items apart before anybody noticed.
 */

export interface MenuVisibilitySectionProps {
  /** The school's map as loaded. A missing key means the item is shown. */
  value: Record<string, boolean>;
  onToggle: (key: string) => void;
}

export function MenuVisibilitySection({ value, onToggle }: MenuVisibilitySectionProps) {
  const { t } = useTranslation();

  return (
    <div className="rounded-lg border border-border-strong bg-surface">
      <div className="border-b border-border px-6 py-4">
        <h2 className="font-semibold text-text">{t("admin.settings.menuVisibility")}</h2>
        <p className="text-xs text-text-subtle">{t("admin.settings.menuVisibilityHint")}</p>
      </div>

      {MENU_GROUPS.map((group) => (
        <div key={group} role="group" aria-labelledby={`menu-visibility-${group}`}>
          <h3
            id={`menu-visibility-${group}`}
            className="bg-surface-2 px-6 py-2 text-3xs font-semibold uppercase tracking-wide text-text-subtle"
          >
            {t(`nav.group.${group}`)}
          </h3>
          <div className="divide-y divide-border">
            {HIDEABLE_ITEMS.filter((item) => item.group === group).map((item) => {
              const on = value[item.key] ?? true;
              return (
                <div key={item.key}>
                  <label className="flex cursor-pointer items-center justify-between px-6 py-3 hover:bg-surface-2">
                    <div>
                      <span className="text-sm font-medium text-text">{t(item.labelKey)}</span>
                      {item.adminOnly && (
                        <span className="ml-2 rounded-pill bg-warning-soft px-2 py-0.5 text-3xs font-semibold text-warning-fg">
                          {t("admin.settings.adminOnly")}
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        type="checkbox"
                        name={item.key}
                        aria-label={t(item.labelKey)}
                        checked={on}
                        onChange={() => onToggle(item.key)}
                        className="peer sr-only"
                      />
                      <div className="h-6 w-11 rounded-pill bg-ink-200 transition-colors peer-checked:bg-primary" />
                      <div className="absolute left-0.5 top-0.5 h-5 w-5 rounded-pill bg-surface shadow transition-transform peer-checked:translate-x-5" />
                    </div>
                  </label>
                  {/* Support is not a feature page, and where it goes depends
                      on the school: its own contact if it gave one in the
                      section above, our donation page if it did not. Nothing
                      else links there either way, so hiding it is worth saying
                      out loud rather than leaving to be discovered. */}
                  {item.key === "support" && !on && (
                    <p className="px-6 pb-3 text-xs text-warning-fg">
                      {t("admin.settings.menuSupportOff")}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
