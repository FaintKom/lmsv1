import type { Subject } from "@/lib/subject";

/**
 * Line drawing for a course without its own picture (specs/073).
 *
 * The cover is the subject's field colour (specs/071) with a thin drawing of
 * the subject on the right: a dialogue for languages, a graph for maths, code
 * with indents for programming, rings for the rest. The course id seeds the
 * variation, so a course always looks the same and its neighbours do not.
 *
 * The markup is built from numbers this file computes; no user text goes in,
 * which is what makes dangerouslySetInnerHTML safe here.
 */

export const COVER_W = 320;
export const COVER_H = 144;

/** Deterministic PRNG (FNV-1a seed, murmur-style mix) over the course id. */
function rng(seed: string): () => number {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507) ^ Math.imul(h ^ (h >>> 13), 3266489909);
    return (h >>> 0) / 4294967296;
  };
}

const n = (v: number) => Math.round(v * 10) / 10;

export function coverArt(subject: Subject, seed: string): string {
  const r = rng(seed);
  const colour = `var(--subject-line-${subject})`;
  // non-scaling-stroke keeps a hairline a hairline on the wide course header.
  const line = `stroke="${colour}" stroke-width="1.5" fill="none" stroke-linecap="round" vector-effect="non-scaling-stroke"`;
  const soft = `${line} opacity=".55"`;
  const x0 = 164 + r() * 16;

  if (subject === "lang") {
    // A message and its reply.
    const rows = 3 + Math.floor(r() * 2);
    let g = `<rect x="${n(x0 + 12)}" y="24" width="104" height="${30 + rows * 10}" rx="14" ${soft}/>`;
    for (let i = 0; i < rows; i++) {
      g += `<line x1="${n(x0 + 28)}" y1="${44 + i * 12}" x2="${n(x0 + 52 + r() * 46)}" y2="${44 + i * 12}" ${soft}/>`;
    }
    return g + `<rect x="${n(x0 - 22)}" y="${68 + rows * 6}" width="70" height="30" rx="12" ${soft}/>`;
  }

  if (subject === "math") {
    // A grid and one function: a wave, a parabola or a growth curve.
    let g = "";
    for (let i = 0; i <= 5; i++) {
      g += `<line x1="${n(x0 + i * 22)}" y1="18" x2="${n(x0 + i * 22)}" y2="128" ${line} opacity=".18"/>`;
      g += `<line x1="${n(x0)}" y1="${18 + i * 22}" x2="${n(x0 + 110)}" y2="${18 + i * 22}" ${line} opacity=".18"/>`;
    }
    const kind = Math.floor(r() * 3);
    const phase = r() * 6;
    const f = [
      (t: number) => Math.sin(t * 9 + phase) * 0.8,
      (t: number) => (2 * t - 1) ** 2 * 1.6 - 0.8,
      (t: number) => 0.8 - Math.exp(t * 2.6) / 7,
    ][kind];
    let d = "";
    for (let x = 0; x <= 110; x += 5) d += `${x ? "L" : "M"}${n(x0 + x)},${n(73 + f(x / 110) * 42)}`;
    return g + `<path d="${d}" stroke="${colour}" stroke-width="2" fill="none" stroke-linecap="round" vector-effect="non-scaling-stroke"/>`;
  }

  if (subject === "code") {
    // Braces around a block whose indentation differs per course.
    const b = x0 + 10;
    let g = `<path d="M${n(b)} 30 q-14 0 -14 14 v16 q0 12 -10 13 q10 1 10 13 v16 q0 14 14 14" ${soft}/>`;
    g += `<path d="M${n(b + 96)} 30 q14 0 14 14 v16 q0 12 10 13 q-10 1 -10 13 v16 q0 14 -14 14" ${soft}/>`;
    const shapes = [[0, 1, 2, 2, 1, 0], [0, 0, 1, 1, 2, 0], [0, 1, 1, 2, 3, 0]];
    shapes[Math.floor(r() * shapes.length)].forEach((indent, i) => {
      const x1 = b + 12 + indent * 12;
      g += `<line x1="${n(x1)}" y1="${42 + i * 13}" x2="${n(x1 + 14 + r() * (70 - indent * 12))}" y2="${42 + i * 13}" ${soft}/>`;
    });
    return g;
  }

  // Everything else: rings rising from the bottom edge, cropped by the card.
  const cx = x0 + 70;
  const cy = 110 + r() * 20;
  let g = "";
  for (let i = 1; i <= 5; i++) {
    g += `<circle cx="${n(cx)}" cy="${n(cy)}" r="${i * 18}" ${line} opacity="${n(0.6 - i * 0.08)}"/>`;
  }
  return g;
}

/** Spread onto an <svg>; the caller adds position and size classes. */
export function coverArtProps(subject: Subject, seed: string) {
  return {
    viewBox: `0 0 ${COVER_W} ${COVER_H}`,
    preserveAspectRatio: "xMaxYMid meet",
    "aria-hidden": true,
    focusable: "false",
    dangerouslySetInnerHTML: { __html: coverArt(subject, seed) },
  } as const;
}
