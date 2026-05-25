import { describe, expect, it } from "vitest";

import { CATALOG_BUILDERS } from "@/lib/room/catalog";
import {
  COL,
  buildBed,
  buildChair,
  buildLamp,
  buildPlant,
  darker,
  flooring,
  lighter,
  walls,
} from "@/lib/room/voxels";

describe("voxel colour helpers", () => {
  it("darker scales each channel down", () => {
    // 0xffffff scaled by 0.5 ≈ 0x808080 (Math.round of 127.5 = 128)
    expect(darker(0xffffff, 0.5)).toBe(0x808080);
  });

  it("lighter clamps at 255 per channel", () => {
    expect(lighter(0xffffff, 2)).toBe(0xffffff);
  });

  it("darker(0) stays at 0", () => {
    expect(darker(0x000000)).toBe(0x000000);
  });
});

describe("voxel build functions", () => {
  it("buildBed/basic returns a Group with multiple meshes", () => {
    const g = buildBed("basic");
    expect(g.type).toBe("Group");
    expect(g.children.length).toBeGreaterThan(10);
  });

  it("buildBed/kids has more meshes than basic (plushie added)", () => {
    const basic = buildBed("basic").children.length;
    const kids = buildBed("kids").children.length;
    expect(kids).toBeGreaterThan(basic);
  });

  it("buildChair returns 6 boxes (seat + 4 legs + back)", () => {
    const g = buildChair();
    expect(g.children.length).toBe(6);
  });

  it("buildLamp + buildPlant produce non-empty groups", () => {
    expect(buildLamp().children.length).toBeGreaterThan(5);
    expect(buildPlant().children.length).toBeGreaterThan(5);
  });
});

describe("flooring + walls", () => {
  it("flooring(wood) lays a base plate + plank strips", () => {
    const g = flooring("wood");
    expect(g.children.length).toBeGreaterThan(1);
  });

  it("flooring(moss) just lays a single base plate", () => {
    const g = flooring("moss");
    expect(g.children.length).toBe(1);
  });

  it("walls renders both wall slabs + crown + baseboard (6 children)", () => {
    const g = walls(COL.lavender);
    expect(g.children.length).toBe(6);
  });
});

describe("CATALOG_BUILDERS registry", () => {
  it("includes every expected backend item id", () => {
    const expected = [
      "bed-basic",
      "bed-kids",
      "bed-double",
      "desk-wood",
      "desk-white",
      "dresser-blue",
      "dresser-cream",
      "shelf-tall",
      "shelf-wall",
      "cabinet",
      "sofa",
      "coffee-table",
      "arcade",
      "chair",
      "monitor",
      "lamp",
      "plant",
      "rug-teal",
      "rug-warm",
      "rug-mint",
      "pictures",
      "window",
      "plushie",
      "trophy",
      "clock",
    ];
    for (const id of expected) {
      expect(CATALOG_BUILDERS[id], `missing builder for ${id}`).toBeDefined();
    }
  });

  it("each builder returns a Group with children", () => {
    for (const [id, builder] of Object.entries(CATALOG_BUILDERS)) {
      const g = builder();
      expect(g.type, `${id} did not return a Group`).toBe("Group");
      expect(g.children.length, `${id} produced 0 meshes`).toBeGreaterThan(0);
    }
  });
});
