import { describe, it, expect } from "vitest";

import { groupRecordings } from "./lesson-list";
import type { LiveLesson } from "@/lib/api/live";
import type { Recording } from "@/lib/api/recordings";

function lesson(id: string, extra: Partial<LiveLesson> = {}): LiveLesson {
  return {
    id,
    org_id: "org-1",
    group_id: "group-a",
    course_id: null,
    teacher_id: "teacher-1",
    class_session_id: null,
    status: "ended",
    follow_mode: "free",
    current_scene: null,
    programme: null,
    created_at: "2026-03-02T10:00:00Z",
    ended_at: "2026-03-02T11:00:00Z",
    summary: null,
    ...extra,
  };
}

function recording(id: string, liveLessonId: string | null): Recording {
  return {
    id,
    user_id: "teacher-1",
    org_id: "org-1",
    type: "video",
    download_url: `/api/v1/recordings/${id}/file`,
    duration_seconds: 125,
    size_bytes: 1048576,
    status: "ready",
    created_at: "2026-03-02T11:05:00Z",
    live_lesson_id: liveLessonId,
    shared_with_group: false,
  };
}

describe("groupRecordings", () => {
  it("files a recording under the lesson it belongs to", () => {
    const { rows } = groupRecordings(
      [lesson("lesson-1"), lesson("lesson-2")],
      [recording("rec-1", "lesson-2")],
    );
    expect(rows.map((r) => r.lesson.id)).toEqual(["lesson-1", "lesson-2"]);
    expect(rows[0].recordings).toEqual([]);
    expect(rows[1].recordings.map((r) => r.id)).toEqual(["rec-1"]);
  });

  it("shows every recording a lesson has, not just the last", () => {
    const { rows } = groupRecordings(
      [lesson("lesson-1")],
      [recording("rec-1", "lesson-1"), recording("rec-2", "lesson-1")],
    );
    expect(rows[0].recordings.map((r) => r.id)).toEqual(["rec-1", "rec-2"]);
  });

  it("keeps a recording made outside any lesson", () => {
    const { rows, others } = groupRecordings(
      [lesson("lesson-1")],
      [recording("rec-loose", null)],
    );
    expect(rows[0].recordings).toEqual([]);
    expect(others.map((r) => r.id)).toEqual(["rec-loose"]);
  });

  // The server hands back the 50 most recent lessons. A recording older than
  // that names a lesson which is simply not on the page — dropping it would
  // lose a file, so it joins the same bucket. That is why the heading has to
  // read "other recordings" rather than "no lesson": one of these two cases
  // would make that a lie.
  it("keeps a recording whose lesson fell off the end of the list", () => {
    const { others } = groupRecordings(
      [lesson("lesson-1")],
      [recording("rec-old", "lesson-99")],
    );
    expect(others.map((r) => r.id)).toEqual(["rec-old"]);
  });

  it("loses nothing: every recording lands somewhere, exactly once", () => {
    const recordings = [
      recording("a", "lesson-1"),
      recording("b", null),
      recording("c", "lesson-2"),
      recording("d", "gone"),
      recording("e", "lesson-1"),
    ];
    const { rows, others } = groupRecordings(
      [lesson("lesson-1"), lesson("lesson-2")],
      recordings,
    );
    const landed = [...rows.flatMap((r) => r.recordings), ...others].map((r) => r.id);
    expect(landed.sort()).toEqual(["a", "b", "c", "d", "e"]);
  });

  it("copes with a lesson nobody recorded and a day nobody taught", () => {
    expect(groupRecordings([], []).rows).toEqual([]);
    expect(groupRecordings([], []).others).toEqual([]);
    expect(groupRecordings([lesson("lesson-1")], []).rows[0].recordings).toEqual([]);
  });
});
