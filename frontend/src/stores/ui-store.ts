import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Chrome preferences for the sidebar: collapsed or not, and which categories
 * are open.
 *
 * Zustand rather than useState because the two route groups mount different
 * layouts — (admin) and (dashboard) — and a preference kept in either one is
 * lost the moment the user crosses between them. That is the current bug, not
 * a hypothetical one: (admin) has no collapse at all today.
 */

// Not a free choice. /cookies already tells the reader this key exists and
// what it holds; the code has to match the promise, not the other way round.
export const SIDEBAR_STORAGE_KEY = "sidebar-collapsed";

interface UIState {
  collapsed: boolean;
  openGroups: Record<string, boolean>;
  toggleCollapsed: () => void;
  setCollapsed: (collapsed: boolean) => void;
  setGroupOpen: (key: string, open: boolean) => void;
}

/**
 * A category we have no opinion about is open.
 *
 * Storing `true` for every group up front would look tidier and behave worse:
 * a category added next year would arrive collapsed for everyone who already
 * has a saved state, and nobody would think to look for it.
 */
export function isGroupOpen(openGroups: Record<string, boolean>, key: string): boolean {
  return openGroups[key] !== false;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      collapsed: false,
      openGroups: {},

      toggleCollapsed: () => set((s) => ({ collapsed: !s.collapsed })),

      setCollapsed: (collapsed) => set({ collapsed }),

      setGroupOpen: (key, open) =>
        set((s) => ({ openGroups: { ...s.openGroups, [key]: open } })),
    }),
    {
      name: SIDEBAR_STORAGE_KEY,
      // The server renders "expanded" because it cannot read localStorage.
      // Hydrating eagerly would make the client's first render disagree with
      // that, which React reports as a hydration mismatch. So we start matched
      // and read storage back from an effect instead. Whoever renders this
      // store therefore owes it a `persist.rehydrate()` on mount — the sidebar
      // does it, and there is a test that fails if it stops.
      skipHydration: true,
    },
  ),
);
