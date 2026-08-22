import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { MENU_ITEM_KEYS, buildNavTree } from "@/components/layout/nav-tree";

import { MenuVisibilitySection } from "./menu-visibility-section";

/**
 * specs/045: экран настроек показывает то же, чем управляет.
 *
 * Разделы у списка пунктов были, но записанные комментариями `// Learning`,
 * `// People` и так далее — то есть для читателя файла, а не для экрана.
 * Настройки поэтому шли шестнадцатью строками подряд, хотя меню рядом рисует
 * те же пункты пятью озаглавленными разделами.
 */

vi.mock("@/lib/i18n/context", () => ({
  useTranslation: () => ({ t: (k: string) => k, locale: "en" }),
}));

/** Порядок разделов выводится из списка, а не объявляется рядом с ним. */
function groupsInOrder(): string[] {
  return [...new Set(MENU_ITEM_KEYS.map((item) => item.group))];
}

/** Контролируемая, как секции над ней: карту держит форма. */
function show(value: Record<string, boolean> = {}, onToggle = () => {}) {
  render(<MenuVisibilitySection value={value} onToggle={onToggle} />);
}

const switches = () => screen.getAllByRole("checkbox");

describe("разделы списка пунктов", () => {
  it("совпадают с разделами меню по составу и порядку", () => {
    const tree = buildNavTree({
      role: "admin",
      menuVisibility: {},
      reviewCount: 0,
      t: (k: string) => k,
    });

    expect(groupsInOrder()).toEqual(tree.groups.map((g) => g.key));
  });

  it("покрывают все шестнадцать пунктов", () => {
    // Пункт без раздела встанет в настройках неизвестно куда, и заметить это
    // на глаз нельзя: он просто окажется под чужим заголовком.
    const orphans = MENU_ITEM_KEYS.filter((item) => !item.group);

    expect(orphans).toEqual([]);
  });
});

describe("по переключателю на каждый скрываемый пункт", () => {
  it("предлагает все, а не десять, как раньше", () => {
    show();
    expect(switches()).toHaveLength(MENU_ITEM_KEYS.length);
  });

  it("отдаёт ключ наверх, когда администратор переключает", () => {
    const onToggle = vi.fn();
    show({}, onToggle);
    fireEvent.click(screen.getByLabelText("nav.journal"));
    expect(onToggle).toHaveBeenCalledWith("journal");
  });

  it("подписывает переключатель строкой самого меню", () => {
    show();
    // Не второй набор строк, который надо держать в согласии, а тот же самый:
    // два места не смогут сказать про один пункт разное.
    for (const item of MENU_ITEM_KEYS) {
      expect(screen.getByLabelText(item.labelKey)).toBeTruthy();
    }
  });
});

describe("прежние решения школы переживают экран", () => {
  // Тихая проверка. Форма, которая нарисует «все шестнадцать включены» и
  // сохранит нарисованное, вернёт обратно то, что школа выключала, и никто
  // об этом не узнает.
  it("показывает выключенным ровно то, что загружено выключенным", () => {
    show({ users: false, analytics: false });
    const off = switches()
      .filter((el) => !(el as HTMLInputElement).checked)
      .map((el) => el.getAttribute("name"));
    expect(off.sort()).toEqual(["analytics", "users"]);
  });

  it("показывает включённым то, про что школа ничего не решала", () => {
    // Часть ключей доехала до карты только теперь. Нет ключа — значит показан,
    // и школа должна увидеть их такими, какими оставила: включёнными.
    show({ users: false });
    expect((screen.getByLabelText("nav.journal") as HTMLInputElement).checked).toBe(true);
    expect((screen.getByLabelText("nav.support") as HTMLInputElement).checked).toBe(true);
  });
});

describe("шестнадцать строк читаются как меню", () => {
  it("берёт разделы меню в порядке меню", () => {
    show();
    const headings = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(headings).toEqual(groupsInOrder().map((g) => `nav.group.${g}`));
  });

  it("держит пункты раздела в том порядке, в каком их показывает меню", () => {
    show();
    for (const group of groupsInOrder()) {
      const region = screen.getByRole("group", { name: `nav.group.${group}` });
      const keys = within(region)
        .getAllByRole("checkbox")
        .map((el) => el.getAttribute("name"));
      expect(keys).toEqual(
        MENU_ITEM_KEYS.filter((i) => i.group === group).map((i) => i.key),
      );
    }
  });

  it("помечает те, которых обычный учитель и так не видит", () => {
    show();
    const marked = screen
      .getAllByText("admin.settings.adminOnly")
      .map((el) => el.closest("label")?.querySelector("input")?.getAttribute("name"));
    expect(marked.sort()).toEqual(["crm", "paths", "users"]);
  });
});

describe("выключение поддержки произносится вслух", () => {
  it("объясняет, чем школа за это платит", () => {
    show({ support: false });
    expect(screen.getByText("admin.settings.menuSupportOff")).toBeTruthy();
  });

  it("молчит, пока поддержка включена", () => {
    show();
    expect(screen.queryByText("admin.settings.menuSupportOff")).toBeNull();
  });

  it("не говорит этого ни про один другой пункт", () => {
    show({ journal: false, analytics: false });
    expect(screen.queryByText("admin.settings.menuSupportOff")).toBeNull();
  });
});
