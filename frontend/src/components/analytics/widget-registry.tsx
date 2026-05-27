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
import { AttendanceImpactWidget } from "./widgets/attendance-impact-widget";
import { CourseEffectivenessWidget } from "./widgets/course-effectiveness-widget";
import { ExerciseDifficultyWidget } from "./widgets/exercise-difficulty-widget";
import { KpiTileWidget } from "./widgets/kpi-tile-widget";
import { LessonFunnelWidget } from "./widgets/lesson-funnel-widget";
import { StudentRisksWidget } from "./widgets/student-risks-widget";
import { TopMoversWidget } from "./widgets/top-movers-widget";

export interface WidgetProps {
  /** Persisted props bag for this widget instance. */
  props?: Record<string, unknown>;
}

export type ConfigFieldType = "number" | "text" | "course";

export interface ConfigField {
  key: string;
  label: string;
  type: ConfigFieldType;
  default?: string | number;
  min?: number;
  max?: number;
  help?: string;
}

export interface WidgetMeta {
  /** Stable type string persisted in DB. Never rename — would orphan dashboards. */
  type: string;
  /** Human-readable label shown in Add Widget menu + widget header. */
  label: string;
  /** i18n key for future translation phase. */
  i18nKey: string;
  /** Default grid size when added. */
  defaultSize: { w: number; h: number };
  /** Minimum grid size. */
  minSize: { w: number; h: number };
  /** React component to render. */
  Component: ComponentType<WidgetProps>;
  /** Form fields surfaced in the per-widget settings popover. */
  configFields?: ConfigField[];
}

export const WIDGET_REGISTRY: Record<string, WidgetMeta> = {
  "kpi-tile": {
    type: "kpi-tile",
    label: "KPI tiles",
    i18nKey: "analytics.widget.kpi_tile",
    defaultSize: { w: 6, h: 3 },
    minSize: { w: 3, h: 2 },
    Component: KpiTileWidget,
    configFields: [
      {
        key: "title",
        label: "Title",
        type: "text",
        help: "Custom widget header. Empty = default name.",
      },
      {
        key: "days",
        label: "Window (days)",
        type: "number",
        default: 7,
        min: 1,
        max: 90,
        help: "Compared to previous equal-length window.",
      },
    ],
  },
  "activity-timeline": {
    type: "activity-timeline",
    label: "Activity timeline",
    i18nKey: "analytics.widget.activity_timeline",
    defaultSize: { w: 8, h: 4 },
    minSize: { w: 4, h: 3 },
    Component: ActivityTimelineWidget,
    configFields: [
      { key: "title", label: "Title", type: "text" },
      {
        key: "days",
        label: "Days",
        type: "number",
        default: 30,
        min: 7,
        max: 90,
      },
    ],
  },
  "top-movers": {
    type: "top-movers",
    label: "Top movers",
    i18nKey: "analytics.widget.top_movers",
    defaultSize: { w: 6, h: 5 },
    minSize: { w: 3, h: 3 },
    Component: TopMoversWidget,
    configFields: [
      { key: "title", label: "Title", type: "text" },
      {
        key: "window_days",
        label: "Window (days)",
        type: "number",
        default: 7,
        min: 1,
        max: 90,
      },
      {
        key: "limit",
        label: "Rows",
        type: "number",
        default: 5,
        min: 1,
        max: 50,
      },
    ],
  },
  "course-effectiveness": {
    type: "course-effectiveness",
    label: "Course effectiveness",
    i18nKey: "analytics.widget.course_effectiveness",
    defaultSize: { w: 8, h: 5 },
    minSize: { w: 4, h: 3 },
    Component: CourseEffectivenessWidget,
    configFields: [{ key: "title", label: "Title", type: "text" }],
  },
  "exercise-difficulty": {
    type: "exercise-difficulty",
    label: "Exercise difficulty",
    i18nKey: "analytics.widget.exercise_difficulty",
    defaultSize: { w: 8, h: 5 },
    minSize: { w: 4, h: 3 },
    Component: ExerciseDifficultyWidget,
    configFields: [
      { key: "title", label: "Title", type: "text" },
      {
        key: "course_id",
        label: "Filter by course",
        type: "course",
        help: "Leave empty for all courses.",
      },
    ],
  },
  "student-risks": {
    type: "student-risks",
    label: "Student risks",
    i18nKey: "analytics.widget.student_risks",
    defaultSize: { w: 6, h: 5 },
    minSize: { w: 3, h: 3 },
    Component: StudentRisksWidget,
    configFields: [
      { key: "title", label: "Title", type: "text" },
      {
        key: "course_id",
        label: "Filter by course",
        type: "course",
        help: "Leave empty for all courses.",
      },
    ],
  },
  "attendance-impact": {
    type: "attendance-impact",
    label: "Attendance impact",
    i18nKey: "analytics.widget.attendance_impact",
    defaultSize: { w: 6, h: 3 },
    minSize: { w: 3, h: 2 },
    Component: AttendanceImpactWidget,
    configFields: [{ key: "title", label: "Title", type: "text" }],
  },
  "lesson-funnel": {
    type: "lesson-funnel",
    label: "Lesson funnel",
    i18nKey: "analytics.widget.lesson_funnel",
    defaultSize: { w: 8, h: 5 },
    minSize: { w: 4, h: 3 },
    Component: LessonFunnelWidget,
    configFields: [
      { key: "title", label: "Title", type: "text" },
      {
        key: "course_id",
        label: "Course",
        type: "course",
        help: "Required — pick a course to populate the funnel.",
      },
    ],
  },
};

export const WIDGET_TYPES = Object.keys(WIDGET_REGISTRY);
