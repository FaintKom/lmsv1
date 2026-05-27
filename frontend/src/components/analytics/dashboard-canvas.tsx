"use client";
/**
 * DashboardCanvas — react-grid-layout wrapper that renders every
 * widget in a dashboard's layout array and persists position/size
 * changes back to the server with a debounce.
 *
 * Layout is the source of truth for which widgets exist. Adding /
 * removing widgets mutates the layout array and saves via PATCH.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import GridLayout, { LayoutItem, useContainerWidth } from "react-grid-layout";

import { useUpdateDashboard } from "@/hooks/use-dashboards";
import type { DashboardResponse, DashboardWidget } from "@/lib/api/analytics";

import { WidgetCard } from "./widget-card";
import { WIDGET_REGISTRY } from "./widget-registry";

import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

const COLS = 12;
const ROW_HEIGHT = 60;
const SAVE_DEBOUNCE_MS = 600;

interface Props {
  dashboard: DashboardResponse;
}

export function DashboardCanvas({ dashboard }: Props) {
  const update = useUpdateDashboard();
  const { width, containerRef, mounted } = useContainerWidth();
  const widgets = useMemo(
    () => dashboard.layout.widgets ?? [],
    [dashboard.layout.widgets],
  );

  const [localLayout, setLocalLayout] = useState<LayoutItem[]>(() =>
    widgets.map((w) => widgetToLayout(w)),
  );

  // Keep local layout in sync if server-side dashboard changes (e.g.
  // refetch picked up a remote edit) — but only when widget ids
  // diverge, otherwise drag-in-flight gets clobbered.
  useEffect(() => {
    setLocalLayout((prev) => {
      const prevIds = new Set(prev.map((l) => l.i));
      const nextIds = new Set(widgets.map((w) => w.id));
      const sameSet =
        prevIds.size === nextIds.size &&
        [...prevIds].every((id) => nextIds.has(id));
      if (sameSet) return prev;
      return widgets.map((w) => widgetToLayout(w));
    });
  }, [widgets]);

  // Debounced save: each layout-change resets the timer.
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    },
    [],
  );

  const scheduleSave = (next: LayoutItem[]) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const merged: DashboardWidget[] = next
        .map((l) => {
          const existing = widgets.find((w) => w.id === l.i);
          if (!existing) return null;
          return {
            ...existing,
            x: l.x,
            y: l.y,
            w: l.w,
            h: l.h,
          };
        })
        .filter((w): w is DashboardWidget => w !== null);
      update.mutate({
        id: dashboard.id,
        body: { layout: { widgets: merged } },
      });
    }, SAVE_DEBOUNCE_MS);
  };

  const handleRemove = (widgetId: string) => {
    const next = widgets.filter((w) => w.id !== widgetId);
    update.mutate({
      id: dashboard.id,
      body: { layout: { widgets: next } },
    });
  };

  if (widgets.length === 0) {
    return (
      <div className="border-2 border-dashed border-border rounded-lg p-12 text-center text-text-muted">
        <div className="text-base font-medium mb-1">No widgets yet</div>
        <div className="text-sm">
          Use the Add widget button above to populate this dashboard.
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef as React.RefObject<HTMLDivElement>}>
      {mounted ? (
    <GridLayout
      className="layout"
      width={width}
      layout={localLayout}
      gridConfig={{ cols: COLS, rowHeight: ROW_HEIGHT, margin: [12, 12] }}
      dragConfig={{ handle: ".widget-drag-handle" }}
      onLayoutChange={(next) => {
        const arr = [...next];
        setLocalLayout(arr);
        scheduleSave(arr);
      }}
    >
      {widgets.map((w) => {
        const meta = WIDGET_REGISTRY[w.type];
        if (!meta) {
          return (
            <div key={w.id}>
              <WidgetCard
                title={`Unknown: ${w.type}`}
                onRemove={() => handleRemove(w.id)}
              >
                <div className="text-sm text-text-muted">
                  This widget type isn’t registered. It may have been removed
                  in a newer release.
                </div>
              </WidgetCard>
            </div>
          );
        }
        const Component = meta.Component;
        return (
          <div key={w.id} data-grid={widgetToLayout(w, meta.minSize)}>
            <WidgetCard
              title={(w.props?.title as string | undefined) ?? meta.i18nKey}
              onRemove={() => handleRemove(w.id)}
            >
              <Component props={w.props} />
            </WidgetCard>
          </div>
        );
      })}
    </GridLayout>
      ) : null}
    </div>
  );
}

function widgetToLayout(
  w: DashboardWidget,
  minSize?: { w: number; h: number },
): LayoutItem {
  return {
    i: w.id,
    x: w.x,
    y: w.y,
    w: w.w,
    h: w.h,
    minW: minSize?.w,
    minH: minSize?.h,
  };
}
