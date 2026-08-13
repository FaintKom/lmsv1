/**
 * Turns a function of x into polyline segments for an SVG plot.
 *
 * The whole job is knowing where *not* to draw a line. Sampling y at even
 * steps and joining every point tells two lies:
 *
 *   tan(x)  — a near-vertical stroke through the asymptote, as if the curve
 *             passed through it
 *   1/x     — a line from +huge straight down to -huge across x = 0
 *
 * So a sample yields a list of segments and the caller draws one polyline per
 * segment. A break happens where the function is undefined (NaN or infinite)
 * and where consecutive samples land off the top and off the bottom of the
 * plot, which is what a pole looks like at any sampling rate.
 */

export interface PlotPoint {
  x: number;
  y: number;
}

export interface SampleOptions {
  xMin: number;
  xMax: number;
  /** Vertical window. Used to spot poles, not to clip — clipping is the SVG's job. */
  yMin: number;
  yMax: number;
  /** Evaluations across the range. Default 400: smooth at any realistic plot width. */
  samples?: number;
}

/** Segments of the curve, in order. An empty array means nothing was drawable. */
export function sampleFunction(
  f: (x: number) => number,
  { xMin, xMax, yMin, yMax, samples = 400 }: SampleOptions,
): PlotPoint[][] {
  if (!(xMax > xMin) || samples < 2) return [];

  const step = (xMax - xMin) / (samples - 1);
  const segments: PlotPoint[][] = [];
  let current: PlotPoint[] = [];
  let previous: PlotPoint | null = null;

  const flush = () => {
    // A lone point draws nothing in a polyline, so it is not a segment.
    if (current.length > 1) segments.push(current);
    current = [];
  };

  for (let i = 0; i < samples; i++) {
    const x = xMin + i * step;
    const y = f(x);

    if (!Number.isFinite(y)) {
      flush();
      previous = null;
      continue;
    }

    if (previous && isPole(previous.y, y, yMin, yMax)) {
      flush();
    }

    current.push({ x, y });
    previous = { x, y };
  }

  flush();
  return segments;
}

/**
 * True when the step from `a` to `b` jumped across a pole rather than climbing.
 *
 * The test is that both ends sit outside the window on opposite sides. A steep
 * but continuous curve leaves the window on one side and comes back on the
 * same side, so it stays joined; tan and 1/x flip from above the top to below
 * the bottom in a single step, and get cut.
 */
function isPole(a: number, b: number, yMin: number, yMax: number): boolean {
  const above = (v: number) => v > yMax;
  const below = (v: number) => v < yMin;
  return (above(a) && below(b)) || (below(a) && above(b));
}

/** Maps sampled points to an SVG `points` attribute. */
export function toSvgPoints(
  segment: PlotPoint[],
  toX: (x: number) => number,
  toY: (y: number) => number,
): string {
  return segment.map((p) => `${toX(p.x).toFixed(2)},${toY(p.y).toFixed(2)}`).join(" ");
}
