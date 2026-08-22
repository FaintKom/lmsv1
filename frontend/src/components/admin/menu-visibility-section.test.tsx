import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { HIDEABLE_ITEMS, MENU_GROUPS } from "@/components/layout/menu-items";

import { MenuVisibilitySection } from "./menu-visibility-section";

vi.mock("@/lib/i18n/context", () => ({
  useTranslation: () => ({ t: (k: string) => k, locale: "en" }),
}));

/** Controlled, like the sections above it: the form owns the map. */
function show(value: Record<string, boolean> = {}, onToggle = () => {}) {
  render(<MenuVisibilitySection value={value} onToggle={onToggle} />);
}

const switches = () => screen.getAllByRole("checkbox");

describe("one switch per hideable item", () => {
  it("offers all of them, not the ten it used to", () => {
    show();
    expect(switches()).toHaveLength(HIDEABLE_ITEMS.length);
  });

  it("hands the key back when the administrator flips one", () => {
    const onToggle = vi.fn();
    show({}, onToggle);
    fireEvent.click(screen.getByLabelText("nav.journal"));
    expect(onToggle).toHaveBeenCalledWith("journal");
  });

  it("labels each switch with the menu's own string", () => {
    show();
    // Not a second set of strings to keep in step — the same one the menu
    // shows, so the two can never say different things about one item.
    for (const item of HIDEABLE_ITEMS) {
      expect(screen.getByLabelText(item.labelKey)).toBeTruthy();
    }
  });
});

describe("a school's earlier decisions survive the screen", () => {
  // The quiet one. A form that renders "all sixteen on" and saves what it
  // rendered would switch back on whatever the school had switched off, and
  // nobody would be told.
  it("shows off exactly what was loaded off", () => {
    show({ users: false, analytics: false });
    const off = switches()
      .filter((el) => !(el as HTMLInputElement).checked)
      .map((el) => el.getAttribute("name"));
    expect(off.sort()).toEqual(["analytics", "users"]);
  });

  it("shows the items a school never decided about as on", () => {
    // Six keys reached the map only now. Absent means shown, and the school
    // should see them as it left them: on.
    show({ users: false });
    expect((screen.getByLabelText("nav.journal") as HTMLInputElement).checked).toBe(true);
    expect((screen.getByLabelText("nav.support") as HTMLInputElement).checked).toBe(true);
  });
});

describe("sixteen rows read like the menu", () => {
  it("uses the menu's categories, in the menu's order", () => {
    show();
    const headings = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(headings).toEqual(MENU_GROUPS.map((g) => `nav.group.${g}`));
  });

  it("keeps each category's items in the order the menu shows them", () => {
    show();
    for (const group of MENU_GROUPS) {
      const region = screen.getByRole("group", { name: `nav.group.${group}` });
      const keys = within(region)
        .getAllByRole("checkbox")
        .map((el) => el.getAttribute("name"));
      expect(keys).toEqual(HIDEABLE_ITEMS.filter((i) => i.group === group).map((i) => i.key));
    }
  });

  it("marks the three an ordinary teacher never sees anyway", () => {
    show();
    const marked = screen
      .getAllByText("admin.settings.adminOnly")
      .map((el) => el.closest("label")?.querySelector("input")?.getAttribute("name"));
    expect(marked.sort()).toEqual(["crm", "paths", "users"]);
  });
});

describe("switching support off is said out loud", () => {
  it("explains what a pupil loses", () => {
    show({ support: false });
    expect(screen.getByText("admin.settings.menuSupportOff")).toBeTruthy();
  });

  it("says nothing while support is on", () => {
    show();
    expect(screen.queryByText("admin.settings.menuSupportOff")).toBeNull();
  });
});
