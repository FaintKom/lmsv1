/**
 * The colour maths behind a school's brand.
 *
 * Pure functions, no React and no DOM, because two unrelated callers need the
 * same answers: the layout that applies the school's colours, and the settings
 * form that shows what they will look like before anything is saved. One
 * implementation or they drift.
 *
 * The rule this file exists to fix: `--primary-fg` used to be a constant —
 * white in light mode, near-black in dark — and never looked at the school's
 * colour at all. A school with a light brand got white text on a light fill,
 * silently.
 */

/** WCAG AA for normal text. The same bar the rest of the project uses. */
const AA = 4.5;

/** Below this, two colours of the same hue stop being tellable apart. */
const MERGE = 1.3;

/** Degrees of hue within which two colours read as the same colour. */
const SAME_HUE = 25;

const LIGHT_TEXT = "#ffffff";
const DARK_TEXT = "#0b0b0b";

type Rgb = [number, number, number];
type Hsl = [number, number, number];

function toRgb(hex: string): Rgb {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as Rgb;
}

function toHex(rgb: Rgb): string {
  return `#${rgb
    .map((v) =>
      Math.max(0, Math.min(255, Math.round(v)))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

function toHsl(hex: string): Hsl {
  const [r, g, b] = toRgb(hex).map((v) => v / 255) as Rgb;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  const l = (max + min) / 2;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
  }
  return [(h * 60 + 360) % 360, s, l];
}

function fromHsl([h, s, l]: Hsl): string {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const t: Rgb =
    h < 60
      ? [c, x, 0]
      : h < 120
        ? [x, c, 0]
        : h < 180
          ? [0, c, x]
          : h < 240
            ? [0, x, c]
            : h < 300
              ? [x, 0, c]
              : [c, 0, x];
  return toHex(t.map((v) => (v + m) * 255) as Rgb);
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = toRgb(hex).map((v) => {
    const n = v / 255;
    return n <= 0.03928 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2.1 contrast, 1 to 21. Symmetric — argument order carries no meaning. */
export function contrastRatio(a: string, b: string): number {
  const x = relativeLuminance(a);
  const y = relativeLuminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

/**
 * What to write ON a fill of this colour.
 *
 * Whichever of light and dark text reads better. When neither clears 4.5:1 —
 * a saturated mid-tone — this still returns the better of the two rather than
 * failing: the school's colour is the school's decision, and the settings form
 * is where the warning belongs. Never substitutes the fill itself.
 */
export function readableOn(fill: string): string {
  return contrastRatio(fill, LIGHT_TEXT) >= contrastRatio(fill, DARK_TEXT)
    ? LIGHT_TEXT
    : DARK_TEXT;
}

/**
 * The same colour, moved until it can be read AS text on `background`.
 *
 * Only lightness moves; the hue is left alone so a school's green still looks
 * like their green. Returns the input untouched when it already clears the bar,
 * which is the common case for a brand chosen with any care.
 */
export function readableAs(color: string, background: string): string {
  if (contrastRatio(color, background) >= AA) return color;

  const [h, s, l] = toHsl(color);
  // Move away from the background: darken on a light page, lighten on a dark
  // one. Binary search on lightness — 24 steps land far finer than 8-bit colour
  // can express, so the result is the closest shade that clears the bar.
  const towardBlack = relativeLuminance(background) > 0.4;
  let lo = 0;
  let hi = 1;
  let best = fromHsl([h, s, towardBlack ? 0 : 1]);

  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    const candidate = fromHsl([h, s, towardBlack ? l * (1 - mid) : l + (1 - l) * mid]);
    if (contrastRatio(candidate, background) >= AA) {
      best = candidate;
      hi = mid;
    } else {
      lo = mid;
    }
  }
  return best;
}

/**
 * Four second colours that go with this one.
 *
 * The order is part of the contract: the first entry is what a school that
 * never touches the field ends up saving, so a reshuffle would change their
 * colour underneath them on the next save.
 *
 * Saturation gets a floor and lightness a clamp so that a near-grey primary
 * still yields four colours you can tell apart, rather than four greys.
 */
export function suggestSecondary(primary: string): string[] {
  const [h, s, l] = toHsl(primary);
  const sat = Math.max(0.35, s);
  const light = Math.min(0.62, Math.max(0.38, l));
  return [40, 180, 120, 210].map((shift) => fromHsl([(h + shift) % 360, sat, light]));
}

/**
 * Two colours near enough that adjacent chart series would read as one.
 *
 * Both tests have to fail, not either. Contrast alone is a luminance measure,
 * and any two colours of the same lightness score badly on it however different
 * their hues — which made the first version warn about nearly every pair we
 * suggested ourselves. A yellow line and a blue line of equal lightness are
 * told apart at a glance; a yellow line and a slightly different yellow are not.
 */
export function tooClose(a: string, b: string): boolean {
  const apart = Math.abs(toHsl(a)[0] - toHsl(b)[0]);
  const hueGap = Math.min(apart, 360 - apart);
  return hueGap < SAME_HUE && contrastRatio(a, b) < MERGE;
}
