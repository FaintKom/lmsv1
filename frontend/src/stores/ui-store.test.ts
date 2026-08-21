import { describe, it, expect, beforeEach } from "vitest";

import { useUIStore, isGroupOpen, SIDEBAR_STORAGE_KEY } from "./ui-store";

beforeEach(() => {
  localStorage.clear();
  useUIStore.setState({ collapsed: false, openGroups: {} });
});

describe("ui-store", () => {
  it("starts expanded", () => {
    expect(useUIStore.getState().collapsed).toBe(false);
  });

  it("toggles collapsed both ways", () => {
    useUIStore.getState().toggleCollapsed();
    expect(useUIStore.getState().collapsed).toBe(true);
    useUIStore.getState().toggleCollapsed();
    expect(useUIStore.getState().collapsed).toBe(false);
  });

  it("remembers a closed group by key", () => {
    useUIStore.getState().setGroupOpen("people", false);
    expect(useUIStore.getState().openGroups.people).toBe(false);
  });

  // A category nobody has touched must render open, not hidden. Storing
  // "open" for every group up front would mean a category added later starts
  // collapsed for everyone who already has a saved state.
  it("treats a group it has never heard of as open", () => {
    expect(isGroupOpen({}, "learning")).toBe(true);
    expect(isGroupOpen({ people: false }, "learning")).toBe(true);
    expect(isGroupOpen({ people: false }, "people")).toBe(false);
  });

  // The name is not a free choice: /cookies already tells the reader this key
  // exists and what it holds. Renaming it makes that page a lie.
  it("writes under the key the cookie policy names", () => {
    expect(SIDEBAR_STORAGE_KEY).toBe("sidebar-collapsed");
    useUIStore.getState().toggleCollapsed();
    expect(localStorage.getItem(SIDEBAR_STORAGE_KEY)).not.toBeNull();
  });

  it("restores both fields after rehydrate", async () => {
    useUIStore.getState().toggleCollapsed();
    useUIStore.getState().setGroupOpen("school", false);
    const saved = localStorage.getItem(SIDEBAR_STORAGE_KEY);

    // A fresh page load is: memory back to defaults, storage untouched.
    // setState alone does not simulate that — the persist middleware writes on
    // every set, so clearing memory would clear the very thing under test.
    // Put the saved copy back before rehydrating.
    useUIStore.setState({ collapsed: false, openGroups: {} });
    localStorage.setItem(SIDEBAR_STORAGE_KEY, saved as string);

    await useUIStore.persist.rehydrate();

    expect(useUIStore.getState().collapsed).toBe(true);
    expect(useUIStore.getState().openGroups.school).toBe(false);
  });
});
