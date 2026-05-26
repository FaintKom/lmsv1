# vox-mcp

Headless MagicaVoxel `.vox` toolkit exposed as a Model Context Protocol
server. Lets an MCP-capable agent (Claude Code, Copilot CLI, Gemini CLI,
Codex, etc.) read, edit, transform, render, and compare voxel files
directly — no GUI driving, no MagicaVoxel.exe required.

Built for the GrassLMS room/avatar feature but generic for any project.

## What it does

| Category | Tools |
|---|---|
| Read | `vox_list`, `vox_read`, `vox_info`, `vox_palette` |
| Edit | `vox_write`, `vox_set`, `vox_set_batch`, `vox_clear`, `vox_fill`, `vox_replace_color`, `vox_palette_set` |
| Transform | `vox_mirror`, `vox_rotate`, `vox_translate`, `vox_crop`, `vox_resize` |
| Render | `vox_render`, `vox_render_grid` |
| Compare | `vox_diff`, `vox_compare_render` |
| Project | `vox_publish` (copy → `frontend/public/voxels/`) |

Renders are pure-CPU (node-canvas + manual orthographic projection of
visible cube faces with painter's-algorithm depth sort). No WebGL, no
browser, ~50 ms per 256×256 render even for ~12k-voxel models. Good enough
for an agent's edit-check loop.

## Build

```bash
cd tools/vox-mcp
docker build -t vox-mcp:latest .
```

First build ~2 min (cairo + pango compile). Subsequent builds use layer cache.

## Self-test

Mount the .vox library and run:

```bash
docker run --rm \
  -v F:/lms-assets/MagicaVoxel/vox:/data/vox \
  -v F:/lms-assets/voxels:/data/exported \
  vox-mcp:latest --self-test
```

Decodes one sample, re-encodes, asserts roundtrip, renders iso + front PNGs
to `/data/exported/_selftest_*.png`. Should print `PASS`.

## Wire into your MCP config

Add an entry to your MCP client config (e.g. `~/.claude.json`):

```jsonc
{
  "mcpServers": {
    "vox": {
      "command": "docker",
      "args": [
        "run", "--rm", "-i",
        "-v", "F:/lms-assets/MagicaVoxel/vox:/data/vox",
        "-v", "F:/lms/frontend/public/voxels:/data/public",
        "-v", "F:/lms-assets/voxels/exported:/data/exported",
        "vox-mcp:latest"
      ]
    }
  }
}
```

Path notes:
- `/data/vox` — agent's main working directory (read/write to your MagicaVoxel models)
- `/data/public` — where `vox_publish` copies edited models so the running game picks them up
- `/data/exported` — scratch/output dir (renders, temp .vox files)

Adjust host paths to your machine. On Windows use forward slashes
(`F:/...`) — Docker on WSL converts them.

Restart your MCP client. Tools appear as `mcp__vox__vox_list`,
`mcp__vox__vox_render`, etc.

## Coordinate system

MagicaVoxel convention is used everywhere:

```
x → right
y → forward / depth
z → up
```

Slot 0 = empty. Palette indices are 1-based (1..255).

## Local dev (no Docker)

```bash
cd tools/vox-mcp
npm install
npm run build
node dist/server.js --self-test
```

Requires Node 22+ and the Cairo/Pango dev libs that `node-canvas`
links against (`apt install libcairo2-dev libpango1.0-dev libjpeg-dev
libgif-dev librsvg2-dev` on Debian/Ubuntu).

## Example agent flow

```
1. vox_list({dir: "/data/vox/avatar"})
   → returns 40 file paths
2. vox_render({path: "/data/vox/avatar/avatar-face-smile.vox", view: "front"})
   → returns PNG, agent visually inspects
3. vox_set_batch({path: "/data/vox/avatar/avatar-face-smile.vox",
                  ops: [{x:5, y:0, z:5, c:1}, ...]})
   → mouth pixel re-positioned
4. vox_render(...) again
   → confirm change
5. vox_publish({srcPath: "/data/vox/avatar/avatar-face-smile.vox",
                itemId: "avatar-face-smile"})
   → copied to public/voxels/, owner reloads /my-room
```

## License

Part of the GrassLMS project. All Rights Reserved.
