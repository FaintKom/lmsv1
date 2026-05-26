/**
 * Paint projected quads to a node-canvas Canvas and emit a PNG buffer.
 */
import { createCanvas, type CanvasRenderingContext2D } from "canvas";

import { getCamera, type View } from "./camera.js";
import { shade } from "./light.js";
import { project } from "./project.js";
import type { VoxModel } from "../vox/grid.js";

export type Background = "white" | "checker" | "transparent";

export interface RenderOptions {
  view?: View;
  size?: [number, number];
  bg?: Background;
  zoom?: number;
}

export function renderToPng(m: VoxModel, opts: RenderOptions = {}): Buffer {
  const view = opts.view ?? "iso";
  const [width, height] = opts.size ?? [256, 256];
  const bg = opts.bg ?? "white";

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  paintBackground(ctx, width, height, bg);

  const camera = getCamera(view);
  const { quads } = project(m, camera, { width, height, zoom: opts.zoom });

  for (const q of quads) {
    const c = shade(q.color, q.face);
    ctx.fillStyle = `rgb(${c.r}, ${c.g}, ${c.b})`;
    ctx.strokeStyle = `rgba(0, 0, 0, ${q.face === "top" ? 0.08 : 0.12})`;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(q.pts[0].sx, q.pts[0].sy);
    ctx.lineTo(q.pts[1].sx, q.pts[1].sy);
    ctx.lineTo(q.pts[2].sx, q.pts[2].sy);
    ctx.lineTo(q.pts[3].sx, q.pts[3].sy);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  return canvas.toBuffer("image/png");
}

function paintBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  bg: Background,
): void {
  if (bg === "transparent") return;
  if (bg === "white") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    return;
  }
  // checker
  const cell = 8;
  for (let y = 0; y < height; y += cell) {
    for (let x = 0; x < width; x += cell) {
      const dark = ((x / cell) | 0) + ((y / cell) | 0);
      ctx.fillStyle = dark % 2 === 0 ? "#f0f0f0" : "#e0e0e0";
      ctx.fillRect(x, y, cell, cell);
    }
  }
}

/** 2×2 grid of views combined into one PNG. */
export function renderGrid(
  m: VoxModel,
  views: View[],
  size: [number, number] = [256, 256],
  bg: Background = "white",
): Buffer {
  const [cellW, cellH] = size;
  const cols = views.length <= 2 ? views.length : 2;
  const rows = Math.ceil(views.length / cols);
  const W = cellW * cols;
  const H = cellH * rows;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");
  paintBackground(ctx, W, H, bg);

  for (let i = 0; i < views.length; i++) {
    const ox = (i % cols) * cellW;
    const oy = Math.floor(i / cols) * cellH;
    ctx.save();
    ctx.translate(ox, oy);
    // Clip so this view can't leak into neighbours.
    ctx.beginPath();
    ctx.rect(0, 0, cellW, cellH);
    ctx.clip();
    paintView(ctx, m, views[i], cellW, cellH, 0.85);
    ctx.restore();
  }
  return canvas.toBuffer("image/png");
}

/**
 * Paint a single view into the current canvas context (no background fill —
 * caller handles that). Used by renderGrid + ops/compare to compose multiple
 * views into one canvas without PNG-encode-then-decode roundtrips.
 */
export function paintView(
  ctx: CanvasRenderingContext2D,
  m: VoxModel,
  view: View,
  width: number,
  height: number,
  zoom: number,
): void {
  const camera = getCamera(view);
  const { quads } = project(m, camera, { width, height, zoom });
  for (const q of quads) {
    const c = shade(q.color, q.face);
    ctx.fillStyle = `rgb(${c.r}, ${c.g}, ${c.b})`;
    ctx.strokeStyle = `rgba(0, 0, 0, ${q.face === "top" ? 0.08 : 0.12})`;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(q.pts[0].sx, q.pts[0].sy);
    ctx.lineTo(q.pts[1].sx, q.pts[1].sy);
    ctx.lineTo(q.pts[2].sx, q.pts[2].sy);
    ctx.lineTo(q.pts[3].sx, q.pts[3].sy);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
}
