/**
 * vox-mcp — MCP server entrypoint.
 *
 * Registers every .vox tool over the stdio transport. Also implements the
 * `--self-test` mode used by `npm run selftest` and the Dockerfile's smoke
 * check, which decodes a known good model, re-encodes it, renders both
 * views, and writes the PNGs out for visual inspection.
 *
 * Note on imports: NodeNext ESM requires explicit `.js` extensions on
 * source-relative paths. TypeScript leaves these as-is in emitted code so
 * Node can resolve them at runtime.
 */
import * as fs from "node:fs";
import * as path from "node:path";

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool,
} from "@modelcontextprotocol/sdk/types.js";

import { decodeFile } from "./vox/decoder.js";
import { encodeFile } from "./vox/encoder.js";
import { countVoxels } from "./vox/grid.js";

import {
  voxInfo, voxList, voxPalette, voxRead,
} from "./ops/read.js";
import {
  voxClear, voxFill, voxPaletteSet, voxReplaceColor, voxSet, voxSetBatch, voxWrite,
} from "./ops/write.js";
import {
  voxCrop, voxMirror, voxResize, voxRotate, voxTranslate,
} from "./ops/transform.js";
import { voxCompareRender, voxDiff } from "./ops/compare.js";
import { voxPublish } from "./ops/project.js";

import { renderGrid, renderToPng } from "./render/raster.js";

// ─── Tool schemas ──────────────────────────────────────────────────────────

const tools: Tool[] = [
  {
    name: "vox_list",
    description: "List every .vox file under {dir} (recursive).",
    inputSchema: {
      type: "object",
      properties: { dir: { type: "string" } },
      required: ["dir"],
    },
  },
  {
    name: "vox_read",
    description: "Decode a .vox file. Returns {dims, palette, voxels[]}.",
    inputSchema: {
      type: "object",
      properties: { path: { type: "string" } },
      required: ["path"],
    },
  },
  {
    name: "vox_info",
    description: "Quick stats: dims, voxelCount, paletteCount, fileBytes.",
    inputSchema: {
      type: "object",
      properties: { path: { type: "string" } },
      required: ["path"],
    },
  },
  {
    name: "vox_palette",
    description: "Palette only ({r,g,b,a}[]).",
    inputSchema: {
      type: "object",
      properties: { path: { type: "string" } },
      required: ["path"],
    },
  },
  {
    name: "vox_write",
    description: "Create or overwrite a .vox file from dims + palette + sparse voxels.",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string" },
        dims: dimsSchema(),
        palette: { type: "array", items: rgbaSchema() },
        voxels: {
          type: "array",
          items: {
            type: "object",
            properties: {
              x: { type: "integer" }, y: { type: "integer" }, z: { type: "integer" },
              c: { type: "integer" },
            },
            required: ["x", "y", "z", "c"],
          },
        },
      },
      required: ["path", "dims", "palette", "voxels"],
    },
  },
  {
    name: "vox_set",
    description: "Set a single voxel at (x, y, z) to colorIdx (0 = empty).",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string" },
        x: { type: "integer" }, y: { type: "integer" }, z: { type: "integer" },
        colorIdx: { type: "integer", minimum: 0, maximum: 255 },
      },
      required: ["path", "x", "y", "z", "colorIdx"],
    },
  },
  {
    name: "vox_set_batch",
    description: "Apply many {x,y,z,c} voxel sets in one write.",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string" },
        ops: {
          type: "array",
          items: {
            type: "object",
            properties: {
              x: { type: "integer" }, y: { type: "integer" }, z: { type: "integer" },
              c: { type: "integer", minimum: 0, maximum: 255 },
            },
            required: ["x", "y", "z", "c"],
          },
        },
      },
      required: ["path", "ops"],
    },
  },
  {
    name: "vox_clear",
    description: "Clear voxels inside {region} (defaults to whole grid).",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string" },
        region: regionSchema(),
      },
      required: ["path"],
    },
  },
  {
    name: "vox_fill",
    description: "Fill every cell in {region} with {colorIdx}.",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string" },
        region: regionSchema(),
        colorIdx: { type: "integer", minimum: 1, maximum: 255 },
      },
      required: ["path", "region", "colorIdx"],
    },
  },
  {
    name: "vox_replace_color",
    description: "Replace every voxel whose palette index = oldIdx with newIdx.",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string" },
        oldIdx: { type: "integer", minimum: 0, maximum: 255 },
        newIdx: { type: "integer", minimum: 0, maximum: 255 },
      },
      required: ["path", "oldIdx", "newIdx"],
    },
  },
  {
    name: "vox_palette_set",
    description: "Overwrite palette slot {idx} with {rgba}.",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string" },
        idx: { type: "integer", minimum: 1, maximum: 255 },
        rgba: rgbaSchema(),
      },
      required: ["path", "idx", "rgba"],
    },
  },
  {
    name: "vox_mirror",
    description: "Mirror grid along {axis} (x/y/z).",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string" },
        axis: { type: "string", enum: ["x", "y", "z"] },
      },
      required: ["path", "axis"],
    },
  },
  {
    name: "vox_rotate",
    description: "Rotate {steps} × 90° CCW around {axis}. Negative steps allowed.",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string" },
        axis: { type: "string", enum: ["x", "y", "z"] },
        steps: { type: "integer" },
      },
      required: ["path", "axis", "steps"],
    },
  },
  {
    name: "vox_translate",
    description: "Shift voxels by (dx,dy,dz). Mode controls how out-of-bounds voxels are handled.",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string" },
        dx: { type: "integer" }, dy: { type: "integer" }, dz: { type: "integer" },
        mode: { type: "string", enum: ["clip", "wrap", "resize"], default: "clip" },
      },
      required: ["path", "dx", "dy", "dz"],
    },
  },
  {
    name: "vox_crop",
    description: "Tighten dimensions to the bounding box of non-empty voxels.",
    inputSchema: {
      type: "object",
      properties: { path: { type: "string" } },
      required: ["path"],
    },
  },
  {
    name: "vox_resize",
    description: "Resize the canvas. Old content is placed at {anchor} (min/centre/max).",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string" },
        newDims: dimsSchema(),
        anchor: { type: "string", enum: ["min", "centre", "max"], default: "min" },
      },
      required: ["path", "newDims"],
    },
  },
  {
    name: "vox_render",
    description: "Render a single view to PNG. Returns base64 in 'image' field.",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string" },
        view: { type: "string", enum: ["iso", "front", "side", "top", "back"], default: "iso" },
        size: { type: "array", items: { type: "integer" }, minItems: 2, maxItems: 2 },
        bg: { type: "string", enum: ["white", "checker", "transparent"], default: "white" },
        zoom: { type: "number", minimum: 0.1, maximum: 4.0 },
      },
      required: ["path"],
    },
  },
  {
    name: "vox_render_grid",
    description: "Render multiple views (2×2 layout for 4, 1×N for ≤2) into one PNG.",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string" },
        views: {
          type: "array",
          items: { type: "string", enum: ["iso", "front", "side", "top", "back"] },
          minItems: 1,
          maxItems: 4,
        },
        size: { type: "array", items: { type: "integer" }, minItems: 2, maxItems: 2 },
      },
      required: ["path", "views"],
    },
  },
  {
    name: "vox_diff",
    description: "Compare two .vox files voxel-by-voxel. Lists added/removed/recolored.",
    inputSchema: {
      type: "object",
      properties: {
        pathA: { type: "string" },
        pathB: { type: "string" },
      },
      required: ["pathA", "pathB"],
    },
  },
  {
    name: "vox_compare_render",
    description: "Side-by-side PNG of two models at the same view.",
    inputSchema: {
      type: "object",
      properties: {
        pathA: { type: "string" },
        pathB: { type: "string" },
        view: { type: "string", enum: ["iso", "front", "side", "top", "back"], default: "iso" },
        size: { type: "array", items: { type: "integer" }, minItems: 2, maxItems: 2 },
      },
      required: ["pathA", "pathB"],
    },
  },
  {
    name: "vox_publish",
    description:
      "Copy a .vox file into the game's public/voxels directory so RoomCanvas " +
      "picks it up. itemId becomes the file basename (e.g. avatar-face-smile).",
    inputSchema: {
      type: "object",
      properties: {
        srcPath: { type: "string" },
        itemId: { type: "string" },
      },
      required: ["srcPath", "itemId"],
    },
  },
];

function dimsSchema(): Record<string, unknown> {
  return {
    type: "object",
    properties: {
      x: { type: "integer", minimum: 1, maximum: 256 },
      y: { type: "integer", minimum: 1, maximum: 256 },
      z: { type: "integer", minimum: 1, maximum: 256 },
    },
    required: ["x", "y", "z"],
  };
}

function rgbaSchema(): Record<string, unknown> {
  return {
    type: "object",
    properties: {
      r: { type: "integer", minimum: 0, maximum: 255 },
      g: { type: "integer", minimum: 0, maximum: 255 },
      b: { type: "integer", minimum: 0, maximum: 255 },
      a: { type: "integer", minimum: 0, maximum: 255 },
    },
    required: ["r", "g", "b", "a"],
  };
}

function regionSchema(): Record<string, unknown> {
  return {
    type: "object",
    properties: {
      x0: { type: "integer" }, y0: { type: "integer" }, z0: { type: "integer" },
      x1: { type: "integer" }, y1: { type: "integer" }, z1: { type: "integer" },
    },
    required: ["x0", "y0", "z0", "x1", "y1", "z1"],
  };
}

// ─── Tool dispatch ─────────────────────────────────────────────────────────

function ok(payload: unknown): { content: Array<{ type: "text"; text: string }> } {
  return { content: [{ type: "text", text: JSON.stringify(payload, null, 2) }] };
}

function pngOk(png: Buffer): {
  content: Array<{ type: "image"; data: string; mimeType: string }>;
} {
  return {
    content: [
      { type: "image", data: png.toString("base64"), mimeType: "image/png" },
    ],
  };
}

type ToolArgs = Record<string, unknown>;

async function dispatch(name: string, args: ToolArgs): Promise<unknown> {
  const arg = <T>(k: string): T => args[k] as T;

  switch (name) {
    case "vox_list":   return ok(voxList(arg<string>("dir")));
    case "vox_read":   return ok(voxRead(arg<string>("path")));
    case "vox_info":   return ok(voxInfo(arg<string>("path")));
    case "vox_palette":return ok(voxPalette(arg<string>("path")));

    case "vox_write":
      return ok(voxWrite(
        arg("path"), arg("dims"), arg("palette"), arg("voxels"),
      ));
    case "vox_set":
      return ok(voxSet(
        arg("path"), arg("x"), arg("y"), arg("z"), arg("colorIdx"),
      ));
    case "vox_set_batch":
      return ok(voxSetBatch(arg("path"), arg("ops")));
    case "vox_clear":
      return ok(voxClear(arg("path"), args.region as never));
    case "vox_fill":
      return ok(voxFill(arg("path"), arg("region"), arg("colorIdx")));
    case "vox_replace_color":
      return ok(voxReplaceColor(arg("path"), arg("oldIdx"), arg("newIdx")));
    case "vox_palette_set":
      return ok(voxPaletteSet(arg("path"), arg("idx"), arg("rgba")));

    case "vox_mirror":
      return ok(voxMirror(arg("path"), arg("axis")));
    case "vox_rotate":
      return ok(voxRotate(arg("path"), arg("axis"), arg("steps")));
    case "vox_translate":
      return ok(voxTranslate(
        arg("path"), arg("dx"), arg("dy"), arg("dz"),
        (args.mode as never) ?? "clip",
      ));
    case "vox_crop":
      return ok(voxCrop(arg("path")));
    case "vox_resize":
      return ok(voxResize(
        arg("path"), arg("newDims"), (args.anchor as never) ?? "min",
      ));

    case "vox_render": {
      const m = decodeFile(arg<string>("path"));
      const png = renderToPng(m, {
        view: args.view as never,
        size: args.size as [number, number] | undefined,
        bg: args.bg as never,
        zoom: args.zoom as number | undefined,
      });
      return pngOk(png);
    }
    case "vox_render_grid": {
      const m = decodeFile(arg<string>("path"));
      const png = renderGrid(
        m,
        arg<string[]>("views") as never,
        (args.size as [number, number] | undefined) ?? [256, 256],
      );
      return pngOk(png);
    }

    case "vox_diff":
      return ok(voxDiff(arg("pathA"), arg("pathB")));
    case "vox_compare_render": {
      const png = voxCompareRender(
        arg("pathA"), arg("pathB"),
        (args.view as never) ?? "iso",
        (args.size as [number, number] | undefined) ?? [256, 256],
      );
      return pngOk(png);
    }

    case "vox_publish":
      return ok(voxPublish(arg("srcPath"), arg("itemId")));

    default:
      throw new Error(`unknown tool: ${name}`);
  }
}

// ─── Self-test mode ────────────────────────────────────────────────────────

function findSampleVox(): string | null {
  const roots = [
    "/data/vox/avatar/avatar-body-boy.vox",
    "/data/vox/room/bed-basic.vox",
    "/data/vox",
  ];
  for (const r of roots) {
    if (!fs.existsSync(r)) continue;
    const stat = fs.statSync(r);
    if (stat.isFile()) return r;
    if (stat.isDirectory()) {
      const found = voxList(r);
      if (found.length > 0) return found[0];
    }
  }
  return null;
}

async function selfTest(): Promise<number> {
  console.log("vox-mcp self-test starting...");
  const sample = findSampleVox();
  if (!sample) {
    console.error("FAIL: no sample .vox found under /data/vox. Did you mount the volume?");
    return 1;
  }
  console.log(`  using sample: ${sample}`);

  // Decode
  const m1 = decodeFile(sample);
  const n1 = countVoxels(m1);
  console.log(`  decoded: ${m1.dims.x}×${m1.dims.y}×${m1.dims.z}, ${n1} voxels, ${m1.palette.length} palette entries`);

  // Re-encode to temp
  const outDir = "/data/exported";
  const writable = (() => {
    try {
      fs.mkdirSync(outDir, { recursive: true });
      const probe = path.join(outDir, ".vox-mcp-selftest.tmp");
      fs.writeFileSync(probe, "");
      fs.unlinkSync(probe);
      return outDir;
    } catch {
      return "/tmp";
    }
  })();
  const reencoded = path.join(writable, "_selftest_reencoded.vox");
  const bytes = encodeFile(reencoded, m1);
  console.log(`  re-encoded: ${reencoded} (${bytes} bytes)`);

  // Decode the re-encoded file and compare.
  const m2 = decodeFile(reencoded);
  const n2 = countVoxels(m2);
  if (n1 !== n2) {
    console.error(`FAIL: voxel count mismatch after re-encode (${n1} vs ${n2})`);
    return 1;
  }
  console.log(`  roundtrip OK (${n2} voxels preserved)`);

  // Render two views and write PNGs.
  const isoPath = path.join(writable, "_selftest_iso.png");
  const frontPath = path.join(writable, "_selftest_front.png");
  fs.writeFileSync(isoPath, renderToPng(m1, { view: "iso", size: [256, 256] }));
  fs.writeFileSync(frontPath, renderToPng(m1, { view: "front", size: [256, 256] }));
  console.log(`  rendered: ${isoPath}, ${frontPath}`);

  console.log("PASS");
  return 0;
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  if (process.argv.includes("--self-test")) {
    const code = await selfTest();
    process.exit(code);
  }

  const server = new Server(
    { name: "vox-mcp", version: "0.1.0" },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const { name, arguments: args } = req.params;
    try {
      return await dispatch(name, (args ?? {}) as ToolArgs) as never;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        isError: true,
        content: [{ type: "text", text: `vox-mcp error: ${msg}` }],
      } as never;
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Stay alive — the SDK handles request loop. Log to stderr only (stdout is MCP).
  console.error("vox-mcp listening on stdio");
}

main().catch((err) => {
  console.error("vox-mcp fatal:", err);
  process.exit(1);
});
