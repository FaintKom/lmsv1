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
}

export const WIDGET_REGISTRY: Record<string, WidgetMeta> = {
  "kpi-tile": {
    type: "kpi-tile",
    label: "KPI tiles",
    i18nKey: "analytics.widget.kpi_tile",
    defaultSize: { w: 6, h: 3 },
    minSize: { w: 3, h: 2 },
    Component: KpiTileWidget,
  },
  "activity-timeline": {
    type: "activity-timeline",
    label: "Activity timeline",
    i18nKey: "analytics.widget.activity_timeline",
    defaultSize: { w: 8, h: 4 },
    minSize: { w: 4, h: 3 },
    Component: ActivityTimelineWidget,
  },
  "top-movers": {
    type: "top-movers",
    label: "Top movers",
    i18nKey: "analytics.widget.top_movers",
    defaultSize: { w: 6, h: 5 },
    minSize: { w: 3, h: 3 },
    Component: TopMoversWidget,
  },
  "course-effectiveness": {
    type: "course-effectiveness",
    label: "Course effectiveness",
    i18nKey: "analytics.widget.course_effectiveness",
    defaultSize: { w: 8, h: 5 },
    minSize: { w: 4, h: 3 },
    Component: CourseEffectivenessWidget,
  },
  "exercise-difficulty": {
    type: "exercise-difficulty",
    label: "Exercise difficulty",
    i18nKey: "analytics.widget.exercise_difficulty",
    defaultSize: { w: 8, h: 5 },
    minSize: { w: 4, h: 3 },
    Component: ExerciseDifficultyWidget,
  },
  "student-risks": {
    type: "student-risks",
    label: "Student risks",
    i18nKey: "analytics.widget.student_risks",
    defaultSize: { w: 6, h: 5 },
    minSize: { w: 3, h: 3 },
    Component: StudentRisksWidget,
  },
  "attendance-impact": {
    type: "attendance-impact",
    label: "Attendance impact",
    i18nKey: "analytics.widget.attendance_impact",
    defaultSize: { w: 6, h: 3 },
    minSize: { w: 3, h: 2 },
    Component: AttendanceImpactWidget,
  },
  "lesson-funnel": {
    type: "lesson-funnel",
    label: "Lesson funnel",
    i18nKey: "analytics.widget.lesson_funnel",
    defaultSize: { w: 8, h: 5 },
    minSize: { w: 4, h: 3 },
    Component: LessonFunnelWidget,
  },
};

export const WIDGET_TYPES = Object.keys(WIDGET_REGISTRY);
