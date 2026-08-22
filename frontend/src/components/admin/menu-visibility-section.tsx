"use client";

import { MENU_ITEM_KEYS } from "@/components/layout/nav-tree";
import { useTranslation } from "@/lib/i18n/context";

/**
 * Какие пункты меню школа прячет.
 *
 * Контролируемая, как секции бренда и контактов над ней: получает карту и
 * способ перевернуть один ключ, и не знает ни про школу, ни про сеть, ни про
 * сохранение. В тот день, когда ей понадобится `orgId`, граница проведена не
 * там.
 *
 * И строки, и разделы берутся из списка самого меню, в порядке меню и с
 * подписями меню. В этом всё дело: экран настроек — про то, как выглядит
 * меню, и второй список здесь означал бы, что два места рассказывают про один
 * пункт разное (specs/040, specs/045).
 */

/** Порядок разделов выводится из списка, а не объявляется рядом с ним. */
const GROUPS = [...new Set(MENU_ITEM_KEYS.map((item) => item.group))];

export interface MenuVisibilitySectionProps {
  /** Карта школы как она загружена. Нет ключа — пункт показан. */
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

      {GROUPS.map((group) => (
        <div key={group} role="group" aria-labelledby={`menu-visibility-${group}`}>
          <h3
            id={`menu-visibility-${group}`}
            className="bg-surface-2 px-6 py-2 text-3xs font-semibold uppercase tracking-wide text-text-subtle"
          >
            {t(`nav.group.${group}`)}
          </h3>
          <div className="divide-y divide-border">
            {MENU_ITEM_KEYS.filter((item) => item.group === group).map((item) => {
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
                  {/* «Поддержка» — не страница функции: за ней либо контакт
                      школы, либо наша страница пожертвований, и другого входа
                      туда нет. Выключение остальных пятнадцати видно сразу;
                      это — нет, поэтому говорится вслух. */}
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
