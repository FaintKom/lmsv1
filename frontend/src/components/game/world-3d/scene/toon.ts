/**
 * The two things that make this scene a cartoon rather than a render: a
 * gradient with steps instead of a smooth falloff, and colours that come from
 * the design tokens.
 *
 * The ramp is three bytes. `MeshToonMaterial` samples it by light intensity, so
 * a three-step texture with nearest-neighbour filtering turns continuous
 * shading into three flat bands — the strongest single cue, and cheaper than
 * any shader we could write.
 *
 * The palette has to be carried across from CSS by hand: WebGL cannot read a
 * custom property. Reading it at mount and again when the theme changes keeps
 * one source of truth, which is the lesson this project already paid for — a
 * raw colour value stays put when the theme flips, while a token follows it.
 */

import { useEffect, useState } from "react";
import * as THREE from "three";

/** Three flat bands: shadow, mid, light. */
export function makeToonGradient(): THREE.DataTexture {
  const steps = new Uint8Array([90, 170, 255]);
  const texture = new THREE.DataTexture(steps, steps.length, 1, THREE.RedFormat);
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

/** Every colour the scene uses, named for what it is rather than what it looks like. */
export interface Palette {
  floor: string;
  floorAlt: string;
  wall: string;
  platform: string;
  item: string;
  button: string;
  buttonPressed: string;
  door: string;
  goal: string;
  body: string;
  face: string;
  visor: string;
  outline: string;
  skyTop: string;
  skyBottom: string;
}

/**
 * Two kinds of colour, and the difference matters.
 *
 * The **pieces** come from the raw scale. A wall is the same orange in both
 * themes on purpose: a game piece that changed colour with the theme would
 * change what it *is*, and a child who learned "orange means you cannot walk
 * there" would have to learn it twice.
 *
 * The **room** — ground, sky, and the line drawn round everything — comes from
 * the semantic tokens, which are the ones `.dark` actually redefines. This
 * distinction is the whole of the theme bug this project has paid for before:
 * the first version of this file read `--green-100` for the floor and
 * `--ink-900` for the outline, and the scene rendered pixel-identical in dark
 * mode, because those raw values are theme-invariant by design.
 */
const TOKENS: Record<keyof Palette, string> = {
  // The room: follows the theme.
  floor: "--color-surface",
  floorAlt: "--color-surface-2",
  skyTop: "--color-surface-2",
  skyBottom: "--color-bg",
  // Dark ink on a pale floor, pale ink on a dark one — the line has to stay
  // visible against whatever it is drawn on.
  outline: "--color-text",

  // The pieces: the same in both themes.
  wall: "--clay-500",
  platform: "--lagoon-400",
  item: "--sun-400",
  button: "--clay-600",
  buttonPressed: "--green-500",
  door: "--lagoon-600",
  goal: "--green-400",
  body: "--green-600",
  face: "--paper-2",
  visor: "--lagoon-600",
};

const FALLBACK: Palette = {
  floor: "#d4f1c4",
  floorAlt: "#ecf9e7",
  wall: "#e2552f",
  platform: "#3aa0b5",
  item: "#ffd84d",
  button: "#c1401d",
  buttonPressed: "#17915e",
  door: "#12798f",
  goal: "#34a06a",
  body: "#0a8754",
  face: "#ffffff",
  visor: "#12798f",
  outline: "#0d150d",
  skyTop: "#b9d9e0",
  skyBottom: "#fbfcf7",
};

function readPalette(): Palette {
  if (typeof window === "undefined") return FALLBACK;
  const style = getComputedStyle(document.documentElement);
  const out = {} as Palette;
  for (const key of Object.keys(TOKENS) as (keyof Palette)[]) {
    out[key] = style.getPropertyValue(TOKENS[key]).trim() || FALLBACK[key];
  }
  return out;
}

/**
 * The palette, re-read when the theme changes.
 *
 * Watches the class on the document element, which is how this project's dark
 * mode is switched, and the system preference for viewers who never touched the
 * toggle.
 */
export function usePalette(): Palette {
  const [palette, setPalette] = useState<Palette>(FALLBACK);

  useEffect(() => {
    const update = () => setPalette(readPalette());
    update();

    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", update);

    return () => {
      observer.disconnect();
      mq.removeEventListener("change", update);
    };
  }, []);

  return palette;
}

/**
 * Whether the viewer asked for less movement.
 *
 * `globals.css` already collapses CSS animation globally, but a WebGL frame
 * loop is invisible to it. A scene that keeps swooping for someone who asked it
 * not to is not merely rude; for some it is unusable.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return reduced;
}

/**
 * How far the dark shell is grown past the shape it outlines, in world units.
 *
 * Measured rather than guessed, by photographing each attempt: at 0.02 the line
 * was there and invisible, a sub-pixel sliver at the distance a six-by-six
 * level puts the camera. 0.05 reads as a drawn edge on a one-unit prop without
 * swallowing the small ones.
 */
export const OUTLINE_WIDTH = 0.1;

/** One grid square, and the height of one level. Everything else is in these. */
export const TILE = 1;
export const LEVEL = 0.45;
