/**
 * Load MagicaVoxel .vox files and convert them to a single InstancedMesh
 * (one draw call per item). Cache parsed results so identical models don't
 * re-fetch / re-parse.
 *
 * MagicaVoxel coordinate convention: x right, y forward, z up.
 * Three.js: x right, y up, z forward.
 * We remap MV's (x, y, z) -> THREE (x, z, y) so the model stands upright.
 *
 * VOX_SIZE is the world size of one MagicaVoxel cube. Smaller = finer
 * detail. The original hand-coded room used 0.4; switching to 0.1 makes
 * 4-voxel-tall items 0.4 world units (similar overall scale) but with 64x
 * more potential resolution per cube of volume.
 */
import * as THREE from "three";
// @ts-expect-error -- parse-magica-voxel ships JS only, no types
import parseMagicaVoxel from "parse-magica-voxel";

export const VOX_SIZE = 0.1;

interface ParsedVox {
  SIZE: { x: number; y: number; z: number };
  XYZI: Array<{ x: number; y: number; z: number; c: number }>;
  RGBA: Array<{ r: number; g: number; b: number; a: number }>;
}

const cache = new Map<string, Promise<THREE.Group>>();

export function loadVoxModel(url: string): Promise<THREE.Group> {
  let pending = cache.get(url);
  if (!pending) {
    pending = fetchAndBuild(url);
    cache.set(url, pending);
  }
  return pending.then((g) => cloneGroup(g));
}

async function fetchAndBuild(url: string): Promise<THREE.Group> {
  const buf = await fetch(url).then((r) => {
    if (!r.ok) throw new Error(`vox load ${url} -> ${r.status}`);
    return r.arrayBuffer();
  });
  const parsed = parseMagicaVoxel(new Uint8Array(buf)) as ParsedVox;
  return buildInstancedMesh(parsed);
}

function buildInstancedMesh(parsed: ParsedVox): THREE.Group {
  const { SIZE, XYZI, RGBA } = parsed;

  const geom = new THREE.BoxGeometry(VOX_SIZE, VOX_SIZE, VOX_SIZE);
  const mat = new THREE.MeshLambertMaterial();
  const mesh = new THREE.InstancedMesh(geom, mat, XYZI.length);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  const dummy = new THREE.Object3D();
  const color = new THREE.Color();

  // Centre the model horizontally (x, y MV plane) and stand it on the floor
  // (z=0 in MV -> y=0 in world).
  const halfX = SIZE.x / 2;
  const halfY = SIZE.y / 2;

  for (let i = 0; i < XYZI.length; i++) {
    const v = XYZI[i];
    const px = (v.x - halfX + 0.5) * VOX_SIZE;
    const pz = (v.y - halfY + 0.5) * VOX_SIZE;
    const py = (v.z + 0.5) * VOX_SIZE;
    dummy.position.set(px, py, pz);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);

    // MV palette index is 1-based. Indexing past the end is safe (clamps).
    const palette = RGBA[v.c - 1] ?? RGBA[0] ?? { r: 200, g: 200, b: 200, a: 255 };
    color.setRGB(palette.r / 255, palette.g / 255, palette.b / 255);
    mesh.setColorAt(i, color);
  }

  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

  const group = new THREE.Group();
  group.add(mesh);
  return group;
}

/**
 * InstancedMesh isn't trivially cloneable -- we want each consumer to own its
 * own instance transforms. Easiest path: shallow-clone the group, copy buffers
 * for the InstancedMesh underneath.
 */
function cloneGroup(src: THREE.Group): THREE.Group {
  const g = new THREE.Group();
  for (const child of src.children) {
    if (child instanceof THREE.InstancedMesh) {
      const cloned = new THREE.InstancedMesh(child.geometry, child.material, child.count);
      cloned.instanceMatrix.array.set(child.instanceMatrix.array);
      cloned.instanceMatrix.needsUpdate = true;
      if (child.instanceColor && cloned.instanceColor) {
        cloned.instanceColor.array.set(child.instanceColor.array);
        cloned.instanceColor.needsUpdate = true;
      }
      cloned.castShadow = child.castShadow;
      cloned.receiveShadow = child.receiveShadow;
      g.add(cloned);
    } else {
      g.add(child.clone());
    }
  }
  return g;
}
