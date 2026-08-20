import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

import { Sidebar } from "./sidebar";
import { useUIStore, SIDEBAR_STORAGE_KEY } from "@/stores/ui-store";

const authState = {
  user: {
    id: "u1",
    full_name: "Ada Admin",
    email: "admin@example.test",
    role: "admin",
    org_id: "org-1",
  },
  branding: {
    logo_url: "https://example.test/logo.png",
    display_name: "Пример школы",
    primary_color: "#22c55e",
    secondary_color: "#3b82f6",
  },
  logout: vi.fn(),
};

vi.mock("@/stores/auth-store", () => ({
  useAuthStore: (selector?: (s: typeof authState) => unknown) =>
    selector ? selector(authState) : authState,
}));

vi.mock("@/lib/i18n/context", () => ({
  useTranslation: () => ({ t: (k: string) => k, locale: "en" }),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin",
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/lib/api-client", () => ({
  default: { get: vi.fn().mockResolvedValue({ data: { count: 0, settings: {} } }) },
}));

// Children that fetch or read browser state of their own; none of them is
// what these tests are about.
vi.mock("./notification-bell", () => ({ NotificationBell: () => null }));
vi.mock("./org-switcher", () => ({ OrgSwitcher: () => null }));
vi.mock("./search-bar", () => ({ SearchBar: () => null }));
vi.mock("./locale-switcher", () => ({ default: () => null }));

beforeEach(() => {
  localStorage.clear();
  useUIStore.setState({ collapsed: false, openGroups: {} });
});

describe("Sidebar", () => {
  it("offers a way to collapse itself", () => {
    render(<Sidebar />);
    expect(
      screen.getByRole("button", { name: "nav.collapseMenu" }),
    ).toBeInTheDocument();
  });

  it("collapses through the shared store, not local state", () => {
    render(<Sidebar />);
    fireEvent.click(screen.getByRole("button", { name: "nav.collapseMenu" }));
    // The store, not the DOM: (admin) and (dashboard) mount different layouts,
    // and only a shared store survives the crossing between them.
    expect(useUIStore.getState().collapsed).toBe(true);
  });

  it("keeps the school's brand on the rail and drops the item labels", () => {
    useUIStore.setState({ collapsed: true, openGroups: {} });
    render(<Sidebar />);

    // The brand survives collapsing — that is the whole point of the rail.
    expect(screen.getByAltText("Пример школы")).toHaveAttribute(
      "src",
      "https://example.test/logo.png",
    );
    expect(screen.getByText("Пример школы")).toBeInTheDocument();

    // The "MENU" heading has no room on a rail and goes entirely.
    expect(screen.queryByText("nav.menu")).not.toBeInTheDocument();

    // Each entry is down to its icon — no label inside the link...
    const courses = screen.getByRole("link", { name: "nav.courses" });
    expect(courses).toHaveTextContent("");
    // ...but the name is still there for anyone not using their eyes. It comes
    // from aria-label; the styled tooltip beside the link is decoration.
    expect(courses).toHaveAttribute("aria-label", "nav.courses");
    expect(screen.getByRole("link", { name: "nav.gradebook" })).toHaveTextContent("");
  });

  it("shows item labels again once expanded", () => {
    render(<Sidebar />);
    expect(screen.getByText("nav.courses")).toBeInTheDocument();
  });

  // The store is declared with skipHydration so the server's first render and
  // the client's agree. Somebody then has to actually read storage back, or
  // the preference is written every time and honoured never.
  it("picks the saved preference back up when it mounts", async () => {
    useUIStore.getState().toggleCollapsed();
    const saved = localStorage.getItem(SIDEBAR_STORAGE_KEY);
    useUIStore.setState({ collapsed: false, openGroups: {} });
    localStorage.setItem(SIDEBAR_STORAGE_KEY, saved as string);

    render(<Sidebar />);

    await waitFor(() => expect(useUIStore.getState().collapsed).toBe(true));
  });
});
