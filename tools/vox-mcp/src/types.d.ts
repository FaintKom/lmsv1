// Ambient module declaration for parse-magica-voxel — it ships JS only.
declare module "parse-magica-voxel" {
  interface ParsedVox {
    SIZE: { x: number; y: number; z: number };
    XYZI: Array<{ x: number; y: number; z: number; c: number }>;
    RGBA: Array<{ r: number; g: number; b: number; a: number }>;
  }
  function parseMagicaVoxel(input: Uint8Array): ParsedVox;
  export default parseMagicaVoxel;
}
