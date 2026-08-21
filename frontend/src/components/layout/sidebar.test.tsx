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

let mockPathname = "/admin";

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/lib/api-client", () => ({
  default: { get: vi.fn().mockResolvedValue({ data: { count: 0, settings: {} } }) },
}));

// Children that fetch or read browser state of their own; none of them is
// what these tests are about.
vi.mock("./notification-bell", () => ({ NotificationBell: () => null }));
vi.mock("./org-switcher", () => ({ OrgSwitcher: () => null }));
vi.mock("./locale-switcher", () => ({ default: () => null }));

beforeEach(() => {
  localStorage.clear();
  useUIStore.setState({ collapsed: false, openGroups: {} });
  mockPathname = "/admin";
  authState.user.role = "admin";
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

describe("Sidebar categories", () => {
  it("puts the entries under headings that say whether they are open", () => {
    render(<Sidebar />);

    const learning = screen.getByRole("button", { name: "nav.group.learning" });
    expect(learning).toHaveAttribute("aria-expanded", "true");

    // The heading must point at the list it controls, or the state it reports
    // belongs to nothing as far as a screen reader is concerned.
    const controls = learning.getAttribute("aria-controls");
    expect(controls).toBeTruthy();
    expect(document.getElementById(controls as string)).toBeInTheDocument();
  });

  it("opens the category holding the page you are on", () => {
    mockPathname = "/admin/courses";
    // Even against a saved preference: you cannot be looking at a page that
    // the menu insists is tucked away.
    useUIStore.setState({ collapsed: false, openGroups: { learning: false } });
    render(<Sidebar />);

    expect(
      screen.getByRole("button", { name: "nav.group.learning" }),
    ).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("link", { name: "nav.courses" })).toBeInTheDocument();
  });

  it("remembers a category the user closed", () => {
    render(<Sidebar />);
    fireEvent.click(screen.getByRole("button", { name: "nav.group.people" }));

    expect(useUIStore.getState().openGroups.people).toBe(false);
    expect(screen.queryByRole("link", { name: "nav.groups" })).not.toBeInTheDocument();
  });

  it("leaves the dashboard outside the categories", () => {
    render(<Sidebar />);
    // Reachable without opening anything, because it is where you start.
    expect(screen.getByRole("link", { name: "nav.dashboard" })).toBeInTheDocument();
  });

  it("gives a pupil a flat menu with no headings at all", () => {
    authState.user.role = "student";
    mockPathname = "/dashboard";
    render(<Sidebar />);

    expect(
      screen.queryByRole("button", { name: "nav.group.learning" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "nav.achievements" })).toBeInTheDocument();
  });

  it("keeps every entry reachable on the rail, closed categories or not", () => {
    useUIStore.setState({ collapsed: false, openGroups: { people: false } });
    render(<Sidebar />);
    expect(screen.queryByRole("link", { name: "nav.groups" })).not.toBeInTheDocument();

    // A rail has no room for headings, so it shows the icons and nothing else.
    // Hiding entries there would leave the user with no way to reach them.
    useUIStore.setState({ collapsed: true, openGroups: { people: false } });
    render(<Sidebar />);
    expect(screen.getAllByRole("link", { name: "nav.groups" }).length).toBeGreaterThan(0);
  });
});
