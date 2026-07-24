import { describe, expect, it } from "vitest";

import { applyDelta, diffElements, markSent } from "./board-delta";

const el = (id: string, version: number, isDeleted = false) => ({ id, version, isDeleted });

describe("diffElements", () => {
  it("detects new and changed elements by version", () => {
    const lastSent = new Map([["a", 1]]);
    const current = [el("a", 2), el("b", 1)];
    const d = diffElements(current, lastSent);
    expect(d.updated.map((e) => e.id)).toEqual(["a", "b"]);
    expect(d.deleted).toEqual([]);
  });

  it("moves isDeleted elements into deleted list", () => {
    const lastSent = new Map([["a", 1]]);
    const d = diffElements([el("a", 2, true)], lastSent);
    expect(d.updated).toEqual([]);
    expect(d.deleted).toEqual(["a"]);
  });

  it("returns empty diff when nothing changed", () => {
    const lastSent = new Map([["a", 2]]);
    const d = diffElements([el("a", 2)], lastSent);
    expect(d.updated).toEqual([]);
    expect(d.deleted).toEqual([]);
  });

  it("markSent makes the next diff empty", () => {
    const lastSent = new Map<string, number>();
    const current = [el("a", 3), el("b", 1)];
    const d = diffElements(current, lastSent);
    markSent(d, lastSent);
    expect(diffElements(current, lastSent)).toEqual({ updated: [], deleted: [] });
  });
});

describe("applyDelta", () => {
  it("upserts and removes elements", () => {
    const scene = [el("a", 1), el("b", 1)];
    const next = applyDelta(scene, { updated: [el("a", 2)], deleted: ["b"], version: 2 });
    expect(next.map((e) => e.id)).toEqual(["a"]);
    expect((next[0] as { version: number }).version).toBe(2);
  });
});
