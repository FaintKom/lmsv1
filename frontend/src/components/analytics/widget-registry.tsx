"use client";
/**
 * Central registry mapping widget `type` → React component + metadata.
 *
 * Adding a new widget = add an entry here + drop the component file
 * under `widgets/`. DashboardCanvas + the Add-Widget menu read from
 * this single source.
 */
import { ComponentType } from "react";

import { ActivityTimelineWidget } from "./widgets/activity-timeline-widget";
import { KpiTileWidget } from "./widgets/kpi-tile-widget";
import { TopMoversWidget } from "./widgets/top-movers-widget";

export interface WidgetProps {
  /** Persisted props bag for this widget instance. */
  props?: Record<string, unknown>;
}

export interface WidgetMeta {
  /** Stable type string persisted in DB. Never rename — would orphan dashboards. */
  type: string;
  /** Display label (i18n key). */
  i18nKey: string;
  /** Default grid size when added. */
  defaultSize: { w: number; h: number };
  /** Minimum grid size. */
  minSize: { w: number; h: number };
  /** React component to render. */
  Component: ComponentType<WidgetProps>;
}

export const WIDGET_REGISTRY: Record<string, WidgetMeta> = {
  "kpi-tile": {
    type: "kpi-tile",
    i18nKey: "analytics.widget.kpi_tile",
    defaultSize: { w: 6, h: 3 },
    minSize: { w: 3, h: 2 },
    Component: KpiTileWidget,
  },
  "activity-timeline": {
    type: "activity-timeline",
    i18nKey: "analytics.widget.activity_timeline",
    defaultSize: { w: 8, h: 4 },
    minSize: { w: 4, h: 3 },
    Component: ActivityTimelineWidget,
  },
  "top-movers": {
    type: "top-movers",
    i18nKey: "analytics.widget.top_movers",
    defaultSize: { w: 6, h: 5 },
    minSize: { w: 3, h: 3 },
    Component: TopMoversWidget,
  },
};

export const WIDGET_TYPES = Object.keys(WIDGET_REGISTRY);
