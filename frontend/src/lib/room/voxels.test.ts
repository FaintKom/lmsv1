import * as THREE from "three";
import { describe, expect, it } from "vitest";

import {
  buildAccessory,
  buildBack,
  buildBoyBody,
  buildFace,
  buildGirlBody,
  buildGlasses,
  buildHair,
  buildHand,
  buildHat,
  buildOutfit,
} from "@/lib/avatar/voxels";
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

/**
 * No-overlap gate: within a single builder, no two boxes may share volume.
 * Coplanar face-touch is OK; any positive-volume intersection is a bug.
 * Prevents regressions to the voxel-inside-voxel rule.
 */
describe("no voxel-inside-voxel overlaps", () => {
  interface Box {
    minX: number;
    minY: number;
    minZ: number;
    maxX: number;
    maxY: number;
    maxZ: number;
  }

  const EPS = 1e-4;

  function extractBoxes(group: THREE.Group): Box[] {
    const out: Box[] = [];
    group.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      const geom = obj.geometry as THREE.BoxGeometry;
      const p = geom.parameters;
      const cx = obj.position.x;
      const cy = obj.position.y;
      const cz = obj.position.z;
      out.push({
        minX: cx - p.width / 2,
        minY: cy - p.height / 2,
        minZ: cz - p.depth / 2,
        maxX: cx + p.width / 2,
        maxY: cy + p.height / 2,
        maxZ: cz + p.depth / 2,
      });
    });
    return out;
  }

  function overlapVolume(a: Box, b: Box): number {
    const ox = Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX);
    const oy = Math.min(a.maxY, b.maxY) - Math.max(a.minY, b.minY);
    const oz = Math.min(a.maxZ, b.maxZ) - Math.max(a.minZ, b.minZ);
    if (ox <= EPS || oy <= EPS || oz <= EPS) return 0;
    return ox * oy * oz;
  }

  function findFirstOverlap(boxes: Box[]): string | null {
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const v = overlapVolume(boxes[i], boxes[j]);
        if (v > EPS) {
          return `box[${i}] ∩ box[${j}] vol=${v.toFixed(4)}`;
        }
      }
    }
    return null;
  }

  function assertClean(id: string, group: THREE.Group): void {
    const boxes = extractBoxes(group);
    const conflict = findFirstOverlap(boxes);
    expect(conflict, `${id}: ${conflict ?? "clean"}`).toBeNull();
  }

  it("every room builder is overlap-free", () => {
    for (const [id, builder] of Object.entries(CATALOG_BUILDERS)) {
      assertClean(id, builder());
    }
  });

  it("every avatar builder is overlap-free", () => {
    const avatarBuilders: Array<[string, () => THREE.Group]> = [
      ["avatar-body-boy", () => buildBoyBody()],
      ["avatar-body-girl", () => buildGirlBody()],
      ...(["smile", "wink", "blush", "cool", "determined", "glasses"] as const).map(
        (k) => [`face-${k}`, () => buildFace(`avatar-face-${k}`)] as [string, () => THREE.Group],
      ),
      ...(["short", "long", "curly", "bun", "mohawk", "bald"] as const).map(
        (k) => [`hair-${k}`, () => buildHair(`avatar-hair-${k}`)] as [string, () => THREE.Group],
      ),
      ...(["tshirt", "cozy", "hoodie", "dress", "sport", "suit"] as const).map(
        (k) =>
          [`outfit-${k}`, () => buildOutfit(`avatar-outfit-${k}`)] as [string, () => THREE.Group],
      ),
      ...(["cap", "beanie", "wizard", "crown", "chef", "graduate"] as const).map(
        (k) => [`hat-${k}`, () => buildHat(`avatar-hat-${k}`)] as [string, () => THREE.Group],
      ),
      ...(["round", "shades", "monocle", "ski", "3d"] as const).map(
        (k) =>
          [`glasses-${k}`, () => buildGlasses(`avatar-glasses-${k}`)] as [
            string,
            () => THREE.Group,
          ],
      ),
      ...(["backpack", "cape", "wings", "quiver", "jetpack"] as const).map(
        (k) => [`back-${k}`, () => buildBack(`avatar-back-${k}`)] as [string, () => THREE.Group],
      ),
      ...(["book", "sword", "pet", "flower", "balloon", "controller"] as const).map(
        (k) => [`hand-${k}`, () => buildHand(`avatar-hand-${k}`)] as [string, () => THREE.Group],
      ),
      ...(["book", "backpack", "headphones", "cape", "pet"] as const).map(
        (k) =>
          [`acc-${k}`, () => buildAccessory(`avatar-acc-${k}`)] as [string, () => THREE.Group],
      ),
    ];
    for (const [id, build] of avatarBuilders) {
      assertClean(id, build());
    }
  });
});
