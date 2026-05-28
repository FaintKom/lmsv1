"use client";
/**
 * Configurable analytics dashboard (canonical).
 *
 * Loads the user's dashboards via /admin/dashboards. Picks the default
 * (or first); if none exist, seeds a role-aware starter dashboard from
 * dashboard-presets (admin / teacher / methodist).
 *
 * Header includes a dashboard switcher with rename, set-default, +
 * delete actions. The Add Widget dropdown reads from WIDGET_REGISTRY.
 */
import { Check, Loader2, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { DashboardCanvas } from "@/components/analytics/dashboard-canvas";
import { DashboardFilterBar } from "@/components/analytics/dashboard-filter-bar";
import { presetForUser, type StaffRole } from "@/components/analytics/dashboard-presets";
import { WIDGET_REGISTRY } from "@/components/analytics/widget-registry";
import { Button } from "@/components/ui/button";
import {
  useCreateDashboard,
  useDashboards,
  useDeleteDashboard,
  useUpdateDashboard,
} from "@/hooks/use-dashboards";
import { useTranslation } from "@/lib/i18n/context";
import type { DashboardResponse, DashboardWidget } from "@/lib/api/analytics";
import { useAuthStore } from "@/stores/auth-store";

export default function AnalyticsPage() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const { data: dashboards, isLoading, error } = useDashboards();
  const create = useCreateDashboard();
  const update = useUpdateDashboard();
  const remove = useDeleteDashboard();
  const [bootstrapped, setBootstrapped] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const active = useMemo(() => {
    if (!dashboards) return null;
    if (activeId) return dashboards.find((d) => d.id === activeId) ?? null;
    return dashboards.find((d) => d.is_default) ?? dashboards[0] ?? null;
  }, [dashboards, activeId]);

  useEffect(() => {
    if (isLoading) return;
    if (bootstrapped) return;
    if (dashboards && dashboards.length === 0 && !create.isPending) {
      setBootstrapped(true);
      const preset = presetForUser(
        user?.role as StaffRole | undefined,
        Boolean(user?.is_methodist),
      );
      create.mutate({
        name: preset.name,
        view_scope: preset.view_scope,
        is_default: true,
        layout: { widgets: preset.widgets },
        filters: preset.filters,
      });
    }
  }, [isLoading, dashboards, bootstrapped, create, user]);

  if (error) {
    return (
      <div className="p-6">
        <div className="text-danger font-semibold mb-2">
          {t("analytics.loadFailed")}
        </div>
        <div className="text-sm text-text-muted whitespace-pre-wrap">
          {(error as Error).message}
        </div>
      </div>
    );
  }

  if (create.error) {
    return (
      <div className="p-6">
        <div className="text-danger font-semibold mb-2">
          {t("analytics.bootstrapFailed")}
        </div>
        <div className="text-sm text-text-muted whitespace-pre-wrap">
          {(create.error as Error).message}
        </div>
      </div>
    );
  }

  if (isLoading || !active) {
    return (
      <div className="flex items-center justify-center h-64 text-text-muted">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  const handleAddWidget = (type: string) => {
    const meta = WIDGET_REGISTRY[type];
    if (!meta) return;
    const widgets = active.layout.widgets ?? [];
    const maxY =
      widgets.length === 0 ? 0 : Math.max(...widgets.map((w) => w.y + w.h));
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
      id: active.id,
      body: { layout: { widgets: [...widgets, newWidget] } },
    });
  };

  const handleNewDashboard = () => {
    create.mutate(
      {
        name: `${t("analytics.dashboard")} ${(dashboards?.length ?? 0) + 1}`,
        view_scope: "org",
        layout: { widgets: [] },
        filters: {},
      },
      {
        onSuccess: (d) => setActiveId(d.id),
      },
    );
  };

  return (
    <div className="p-6 space-y-4">
      <DashboardHeader
        active={active}
        dashboards={dashboards ?? []}
        onSwitch={setActiveId}
        onAdd={handleAddWidget}
        onNew={handleNewDashboard}
        onRename={(name) =>
          update.mutate({ id: active.id, body: { name } })
        }
        onSetDefault={() =>
          update.mutate({ id: active.id, body: { is_default: true } })
        }
        onDelete={() => {
          if (window.confirm(`${t("analytics.deleteConfirm")} "${active.name}"?`)) {
            remove.mutate(active.id, {
              onSuccess: () => setActiveId(null),
            });
          }
        }}
      />
      <DashboardFilterBar dashboard={active} />
      <DashboardCanvas dashboard={active} />
    </div>
  );
}

interface HeaderProps {
  active: DashboardResponse;
  dashboards: DashboardResponse[];
  onSwitch: (id: string) => void;
  onAdd: (type: string) => void;
  onNew: () => void;
  onRename: (name: string) => void;
  onSetDefault: () => void;
  onDelete: () => void;
}

function DashboardHeader({
  active,
  dashboards,
  onSwitch,
  onAdd,
  onNew,
  onRename,
  onSetDefault,
  onDelete,
}: HeaderProps) {
  const { t } = useTranslation();
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [draftName, setDraftName] = useState(active.name);

  useEffect(() => {
    setDraftName(active.name);
  }, [active.name]);

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0 flex items-center gap-3">
        {renaming ? (
          <input
            value={draftName}
            autoFocus
            onChange={(e) => setDraftName(e.target.value)}
            onBlur={() => {
              setRenaming(false);
              if (draftName.trim() && draftName !== active.name) {
                onRename(draftName.trim());
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              if (e.key === "Escape") {
                setDraftName(active.name);
                setRenaming(false);
              }
            }}
            className="text-2xl font-bold text-text bg-surface-2 border border-border rounded px-2 py-1"
          />
        ) : (
          <button
            type="button"
            onClick={() => setSwitcherOpen((v) => !v)}
            className="text-2xl font-bold text-text truncate hover:underline"
          >
            {active.name}
            {active.is_default ? (
              <span className="ml-2 text-xs uppercase tracking-wide text-success">
                {t("analytics.default")}
              </span>
            ) : null}
          </button>
        )}

        {switcherOpen ? (
          <div
            className="absolute mt-12 w-72 bg-paper-2 border border-border rounded-md shadow-lg z-20"
            onMouseLeave={() => setSwitcherOpen(false)}
          >
            <ul className="py-1 text-sm">
              {dashboards.map((d) => (
                <li key={d.id}>
                  <button
                    type="button"
                    className="w-full text-left px-3 py-2 hover:bg-surface-2 flex items-center justify-between"
                    onClick={() => {
                      onSwitch(d.id);
                      setSwitcherOpen(false);
                    }}
                  >
                    <span className="truncate">{d.name}</span>
                    {d.id === active.id ? (
                      <Check className="w-4 h-4 text-success" />
                    ) : null}
                  </button>
                </li>
              ))}
              <li className="border-t border-border">
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 hover:bg-surface-2 text-primary flex items-center gap-2"
                  onClick={() => {
                    onNew();
                    setSwitcherOpen(false);
                  }}
                >
                  <Plus className="w-4 h-4" />
                  {t("analytics.newDashboard")}
                </button>
              </li>
            </ul>
          </div>
        ) : null}

        <div className="relative">
          <button
            type="button"
            onClick={() => setMoreOpen((v) => !v)}
            className="p-1.5 rounded hover:bg-surface-2 text-text-muted"
            aria-label={t("analytics.dashboardActions")}
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
          {moreOpen ? (
            <div
              className="absolute left-0 mt-2 w-56 bg-paper-2 border border-border rounded-md shadow-lg z-20"
              onMouseLeave={() => setMoreOpen(false)}
            >
              <ul className="py-1 text-sm">
                <li>
                  <button
                    type="button"
                    className="w-full text-left px-3 py-2 hover:bg-surface-2 flex items-center gap-2"
                    onClick={() => {
                      setRenaming(true);
                      setMoreOpen(false);
                    }}
                  >
                    <Pencil className="w-4 h-4" />
                    {t("analytics.rename")}
                  </button>
                </li>
                {!active.is_default ? (
                  <li>
                    <button
                      type="button"
                      className="w-full text-left px-3 py-2 hover:bg-surface-2 flex items-center gap-2"
                      onClick={() => {
                        onSetDefault();
                        setMoreOpen(false);
                      }}
                    >
                      <Check className="w-4 h-4" />
                      {t("analytics.setDefault")}
                    </button>
                  </li>
                ) : null}
                <li className="border-t border-border">
                  <button
                    type="button"
                    className="w-full text-left px-3 py-2 hover:bg-surface-2 text-danger flex items-center gap-2"
                    onClick={() => {
                      onDelete();
                      setMoreOpen(false);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                    {t("analytics.deleteDashboard")}
                  </button>
                </li>
              </ul>
            </div>
          ) : null}
        </div>
      </div>

      <div className="relative">
        <Button
          variant="default"
          onClick={() => setAddMenuOpen((v) => !v)}
          className="gap-2"
        >
          <Plus className="w-4 h-4" />
          {t("analytics.addWidget")}
        </Button>
        {addMenuOpen ? (
          <div
            className="absolute right-0 mt-2 w-64 bg-paper-2 border border-border rounded-md shadow-lg z-10"
            onMouseLeave={() => setAddMenuOpen(false)}
          >
            <ul className="py-1 text-sm">
              {Object.values(WIDGET_REGISTRY).map((meta) => (
                <li key={meta.type}>
                  <button
                    type="button"
                    className="w-full text-left px-3 py-2 hover:bg-surface-2 flex items-center justify-between"
                    onClick={() => {
                      onAdd(meta.type);
                      setAddMenuOpen(false);
                    }}
                  >
                    <span>{meta.i18nKey ? t(meta.i18nKey) : meta.label}</span>
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
