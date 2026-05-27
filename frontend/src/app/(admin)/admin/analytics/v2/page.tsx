"use client";
/**
 * Customisable analytics v2 dashboard.
 *
 * Loads the user's default dashboard via /admin/dashboards. If none
 * exists, creates a seed one with a 3-widget default layout, then
 * renders the RGL canvas.
 *
 * The Add Widget dropdown reads from WIDGET_REGISTRY so adding a new
 * type only requires touching the registry.
 */
import { Loader2, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { DashboardCanvas } from "@/components/analytics/dashboard-canvas";
import { WIDGET_REGISTRY } from "@/components/analytics/widget-registry";
import { Button } from "@/components/ui/button";
import {
  useCreateDashboard,
  useDashboards,
  useUpdateDashboard,
} from "@/hooks/use-dashboards";
import type { DashboardResponse, DashboardWidget } from "@/lib/api/analytics";

const SEED_LAYOUT: DashboardWidget[] = [
  { id: "kpi-1", type: "kpi-tile", x: 0, y: 0, w: 6, h: 3, props: { days: 7 } },
  {
    id: "act-1",
    type: "activity-timeline",
    x: 6,
    y: 0,
    w: 6,
    h: 4,
    props: { days: 30 },
  },
  {
    id: "mov-1",
    type: "top-movers",
    x: 0,
    y: 3,
    w: 6,
    h: 5,
    props: { window_days: 7, limit: 5 },
  },
];

export default function AnalyticsV2Page() {
  const { data: dashboards, isLoading } = useDashboards();
  const create = useCreateDashboard();
  const update = useUpdateDashboard();
  const [bootstrapped, setBootstrapped] = useState(false);

  const defaultDashboard = useMemo(
    () => dashboards?.find((d) => d.is_default) ?? dashboards?.[0],
    [dashboards],
  );

  // First-load: if user has no dashboards, create a seeded default.
  useEffect(() => {
    if (isLoading) return;
    if (bootstrapped) return;
    if (dashboards && dashboards.length === 0 && !create.isPending) {
      setBootstrapped(true);
      create.mutate({
        name: "My dashboard",
        view_scope: "org",
        is_default: true,
        layout: { widgets: SEED_LAYOUT },
        filters: { range: "30d" },
      });
    }
  }, [isLoading, dashboards, bootstrapped, create]);

  if (isLoading || !defaultDashboard) {
    return (
      <div className="flex items-center justify-center h-64 text-text-muted">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  const handleAddWidget = (type: string) => {
    const meta = WIDGET_REGISTRY[type];
    if (!meta) return;
    const widgets = defaultDashboard.layout.widgets ?? [];
    const maxY =
      widgets.length === 0
        ? 0
        : Math.max(...widgets.map((w) => w.y + w.h));
    const newWidget: DashboardWidget = {
      id: `${type}-${Date.now().toString(36)}`,
      type,
      x: 0,
      y: maxY,
      w: meta.defaultSize.w,
      h: meta.defaultSize.h,
      props: {},
    };
    update.mutate({
      id: defaultDashboard.id,
      body: { layout: { widgets: [...widgets, newWidget] } },
    });
  };

  return (
    <div className="p-6 space-y-4">
      <DashboardHeader dashboard={defaultDashboard} onAdd={handleAddWidget} />
      <DashboardCanvas dashboard={defaultDashboard} />
    </div>
  );
}

interface HeaderProps {
  dashboard: DashboardResponse;
  onAdd: (type: string) => void;
}

function DashboardHeader({ dashboard, onAdd }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-text truncate">
          {dashboard.name}
        </h1>
        <p className="text-sm text-text-muted">
          Scope: {dashboard.view_scope.replace("_", " ")} ·{" "}
          {dashboard.layout.widgets?.length ?? 0} widgets
        </p>
      </div>
      <div className="relative">
        <Button
          variant="default"
          onClick={() => setMenuOpen((v) => !v)}
          className="gap-2"
        >
          <Plus className="w-4 h-4" />
          Add widget
        </Button>
        {menuOpen ? (
          <div
            className="absolute right-0 mt-2 w-64 bg-paper-2 border border-border rounded-md shadow-lg z-10"
            onMouseLeave={() => setMenuOpen(false)}
          >
            <ul className="py-1 text-sm">
              {Object.values(WIDGET_REGISTRY).map((meta) => (
                <li key={meta.type}>
                  <button
                    type="button"
                    className="w-full text-left px-3 py-2 hover:bg-surface-2 flex items-center justify-between"
                    onClick={() => {
                      onAdd(meta.type);
                      setMenuOpen(false);
                    }}
                  >
                    <span>{meta.i18nKey}</span>
                    <span className="text-xs text-text-muted">
                      {meta.defaultSize.w}×{meta.defaultSize.h}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}
