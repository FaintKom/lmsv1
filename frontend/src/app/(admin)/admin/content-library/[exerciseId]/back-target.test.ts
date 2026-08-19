import { describe, expect, it } from "vitest";

import { backTarget } from "./back-target";

describe("backTarget", () => {
  it("returns the course editor for a valid course id", () => {
    expect(backTarget("123e4567-e89b-42d3-a456-426614174000")).toBe(
      "/admin/courses/123e4567-e89b-42d3-a456-426614174000/edit"
    );
  });

  it("falls back to the content library otherwise", () => {
    expect(backTarget(null)).toBe("/admin/content-library");
    expect(backTarget("")).toBe("/admin/content-library");
    expect(backTarget("not-a-uuid")).toBe("/admin/content-library");
    expect(backTarget("../../../etc/passwd")).toBe("/admin/content-library");
    expect(backTarget("123e4567-e89b-42d3-a456-42661417400Z")).toBe(
      "/admin/content-library"
    );
  });
});
