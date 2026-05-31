import { describe, expect, it } from "vitest";

import {
  isOnlineOnlyContentType,
  parseVariant,
  variantShowsAnswers,
} from "./print";

describe("parseVariant", () => {
  it("returns 'student' only for the exact string", () => {
    expect(parseVariant("student")).toBe("student");
  });

  it("defaults to 'teacher' for missing / junk values", () => {
    expect(parseVariant("teacher")).toBe("teacher");
    expect(parseVariant(null)).toBe("teacher");
    expect(parseVariant(undefined)).toBe("teacher");
    expect(parseVariant("")).toBe("teacher");
    expect(parseVariant("nonsense")).toBe("teacher");
  });
});

describe("variantShowsAnswers", () => {
  it("shows answers for the teacher (answer-key) variant", () => {
    expect(variantShowsAnswers("teacher")).toBe(true);
  });

  it("hides answers for the student (worksheet) variant", () => {
    expect(variantShowsAnswers("student")).toBe(false);
  });
});

describe("isOnlineOnlyContentType", () => {
  it("flags interactive runtimes that cannot print", () => {
    expect(isOnlineOnlyContentType("code_challenge")).toBe(true);
    expect(isOnlineOnlyContentType("interactive")).toBe(true);
    expect(isOnlineOnlyContentType("world_3d")).toBe(true);
    expect(isOnlineOnlyContentType("robot_2d")).toBe(true);
  });

  it("does not flag printable content types", () => {
    expect(isOnlineOnlyContentType("text")).toBe(false);
    expect(isOnlineOnlyContentType("quiz")).toBe(false);
    expect(isOnlineOnlyContentType("theory")).toBe(false);
    expect(isOnlineOnlyContentType("video")).toBe(false);
  });
});
