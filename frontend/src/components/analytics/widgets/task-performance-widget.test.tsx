import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import type { CourseTaskStats } from "@/lib/api/analytics";

import { TaskPerformanceWidget } from "./task-performance-widget";

// useTranslation → identity (return the key) so assertions are stable.
vi.mock("@/lib/i18n/context", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

const useCourseTaskStatsMock = vi.fn();
vi.mock("@/hooks/use-dashboards", () => ({
  useCourseTaskStats: (...args: unknown[]) => useCourseTaskStatsMock(...args),
}));

const SAMPLE: CourseTaskStats = {
  course_id: "11111111-1111-1111-1111-111111111111",
  course_title: "Algebra I",
  enrolled_students: 30,
  tasks: [
    {
      task_id: "aaaaaaaa-0000-0000-0000-000000000001",
      task_type: "exercise",
      title: "Solve linear equations",
      course_id: "11111111-1111-1111-1111-111111111111",
      lesson_id: "lesson-1",
      total_submissions: 50,
      unique_students: 25,
      success_count: 40,
      failure_count: 10,
      pass_rate: 80,
      avg_attempts: 1.4,
      avg_time_spent_seconds: 95, // → "1:35"
      median_time_spent_seconds: 80,
      completion_rate: 83.3,
    },
    {
      task_id: "bbbbbbbb-0000-0000-0000-000000000002",
      task_type: "quiz",
      title: "Chapter 1 quiz",
      course_id: "11111111-1111-1111-1111-111111111111",
      lesson_id: "lesson-2",
      total_submissions: 20,
      unique_students: 18,
      success_count: 8,
      failure_count: 12,
      pass_rate: 40,
      avg_attempts: 2.1,
      avg_time_spent_seconds: null,
      median_time_spent_seconds: null,
      completion_rate: null,
    },
  ],
};

beforeEach(() => {
  useCourseTaskStatsMock.mockReset();
});

describe("TaskPerformanceWidget", () => {
  it("prompts to pick a course when none configured", () => {
    useCourseTaskStatsMock.mockReturnValue({ data: undefined, isLoading: false, error: null });
    render(<TaskPerformanceWidget props={{}} />);
    expect(screen.getByText("analytics.taskPerf.pickCourse")).toBeInTheDocument();
  });

  it("shows empty state when course has no tasks", () => {
    useCourseTaskStatsMock.mockReturnValue({
      data: { ...SAMPLE, tasks: [] },
      isLoading: false,
      error: null,
    });
    render(<TaskPerformanceWidget props={{ course_id: SAMPLE.course_id }} />);
    expect(screen.getByText("analytics.taskPerf.empty")).toBeInTheDocument();
  });

  it("renders rows with formatted time (m:ss) and pass-rate %", () => {
    useCourseTaskStatsMock.mockReturnValue({ data: SAMPLE, isLoading: false, error: null });
    render(<TaskPerformanceWidget props={{ course_id: SAMPLE.course_id }} />);
    // Titles also appear as lesson-filter <option> labels, hence getAllByText.
    expect(screen.getAllByText("Solve linear equations").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Chapter 1 quiz").length).toBeGreaterThan(0);
    expect(screen.getByText("1:35")).toBeInTheDocument(); // 95s formatted
    expect(screen.getByText("80%")).toBeInTheDocument();
    expect(screen.getByText("40%")).toBeInTheDocument();
  });

  it("export button triggers a client-side CSV download", () => {
    useCourseTaskStatsMock.mockReturnValue({ data: SAMPLE, isLoading: false, error: null });
    // jsdom doesn't implement the URL object-URL APIs — stub them.
    const createUrl = vi.fn().mockReturnValue("blob:mock");
    const revokeUrl = vi.fn();
    (URL as unknown as { createObjectURL: unknown }).createObjectURL = createUrl;
    (URL as unknown as { revokeObjectURL: unknown }).revokeObjectURL = revokeUrl;
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined);

    render(<TaskPerformanceWidget props={{ course_id: SAMPLE.course_id }} />);
    fireEvent.click(screen.getByText("analytics.taskPerf.exportCsv"));

    expect(createUrl).toHaveBeenCalledTimes(1);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(revokeUrl).toHaveBeenCalledTimes(1);

    clickSpy.mockRestore();
  });
});
