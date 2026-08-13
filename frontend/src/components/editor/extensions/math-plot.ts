import { Node, mergeAttributes } from "@tiptap/core";

import { ExpressionError, compileExpression } from "@/lib/math/expression";
import { sampleFunction, toSvgPoints } from "@/lib/math/plot";

/**
 * mathPlot — an inline function plot for lesson theory and problem statements.
 *
 * Sits beside MathBlock: that one renders a formula with KaTeX, this one draws
 * what the formula looks like. Expressions go through lib/math/expression,
 * never `eval` — the text is whatever a teacher typed into a lesson.
 *
 * Plain SVG on design tokens rather than a charting library, per the decision
 * in tasks/todo.md. One node view serves both the editor and the student,
 * because lesson content is rendered by a read-only BlockEditor.
 */

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    mathPlot: {
      setMathPlot: (attrs?: Partial<MathPlotAttrs>) => ReturnType;
    };
  }
}

export interface MathPlotAttrs {
  /** One or more expressions in x, separated by ";". */
  expr: string;
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

const DEFAULTS: MathPlotAttrs = {
  expr: "x^2",
  xMin: -10,
  xMax: 10,
  yMin: -10,
  yMax: 10,
};

const SIZE = 320;
const PAD = 24;

/** Categorical series colours, reserved for exactly this — see globals.css. */
const CURVE_COLORS = [
  "var(--viz-1)",
  "var(--viz-2)",
  "var(--viz-3)",
  "var(--viz-4)",
  "var(--viz-5)",
];

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function readAttrs(raw: Record<string, unknown>): MathPlotAttrs {
  const num = (v: unknown, fallback: number) => {
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : fallback;
  };
  return {
    expr: typeof raw.expr === "string" && raw.expr ? raw.expr : DEFAULTS.expr,
    xMin: num(raw.xMin, DEFAULTS.xMin),
    xMax: num(raw.xMax, DEFAULTS.xMax),
    yMin: num(raw.yMin, DEFAULTS.yMin),
    yMax: num(raw.yMax, DEFAULTS.yMax),
  };
}

/** A grid step that lands on 1, 2 or 5 times a power of ten. */
function niceStep(span: number): number {
  const rough = span / 10;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rough)));
  const normalised = rough / magnitude;
  const step = normalised >= 5 ? 5 : normalised >= 2 ? 2 : 1;
  return step * magnitude;
}

/**
 * The whole plot as an SVG string: grid, axes, then one polyline per segment
 * of each curve. Returns a message instead when an expression does not parse —
 * a teacher needs to see the reason, not an empty box.
 */
export function renderPlotSvg(attrs: MathPlotAttrs): { svg: string; error: string | null } {
  const { expr, xMin, xMax, yMin, yMax } = attrs;

  if (!(xMax > xMin) || !(yMax > yMin)) {
    return { svg: "", error: "Each range must go from a smaller number to a larger one" };
  }

  const sources = expr
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
  if (sources.length === 0) return { svg: "", error: "Nothing to plot" };

  const toX = (x: number) => PAD + ((x - xMin) / (xMax - xMin)) * (SIZE - PAD * 2);
  const toY = (y: number) => PAD + ((yMax - y) / (yMax - yMin)) * (SIZE - PAD * 2);

  const parts: string[] = [];

  // Grid on --color-border so it keeps its weight in both themes; a raw scale
  // value would stay light and glare on the dark surface.
  const stepX = niceStep(xMax - xMin);
  for (let v = Math.ceil(xMin / stepX) * stepX; v <= xMax; v += stepX) {
    const px = toX(v).toFixed(1);
    parts.push(
      `<line x1="${px}" y1="${PAD}" x2="${px}" y2="${SIZE - PAD}" stroke="var(--color-border)" stroke-width="1" />`,
    );
  }
  const stepY = niceStep(yMax - yMin);
  for (let v = Math.ceil(yMin / stepY) * stepY; v <= yMax; v += stepY) {
    const py = toY(v).toFixed(1);
    parts.push(
      `<line x1="${PAD}" y1="${py}" x2="${SIZE - PAD}" y2="${py}" stroke="var(--color-border)" stroke-width="1" />`,
    );
  }

  // Axes, drawn only where zero is inside the window.
  if (yMin <= 0 && yMax >= 0) {
    const py = toY(0).toFixed(1);
    parts.push(
      `<line x1="${PAD}" y1="${py}" x2="${SIZE - PAD}" y2="${py}" stroke="var(--color-text-subtle)" stroke-width="1.5" />`,
    );
  }
  if (xMin <= 0 && xMax >= 0) {
    const px = toX(0).toFixed(1);
    parts.push(
      `<line x1="${px}" y1="${PAD}" x2="${px}" y2="${SIZE - PAD}" stroke="var(--color-text-subtle)" stroke-width="1.5" />`,
    );
  }

  for (const [i, source] of sources.entries()) {
    let f: (x: number) => number;
    try {
      f = compileExpression(source);
    } catch (e) {
      const why = e instanceof ExpressionError ? e.message : "Could not read the expression";
      return { svg: "", error: `${source} — ${why}` };
    }
    const colour = CURVE_COLORS[i % CURVE_COLORS.length];
    for (const segment of sampleFunction(f, { xMin, xMax, yMin, yMax })) {
      parts.push(
        `<polyline points="${toSvgPoints(segment, toX, toY)}" fill="none" stroke="${colour}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />`,
      );
    }
  }

  // Clipped to the plot area: a curve leaving the window stops at the frame
  // instead of painting over the surrounding text.
  const inner = SIZE - PAD * 2;
  const svg =
    `<svg viewBox="0 0 ${SIZE} ${SIZE}" width="100%" style="max-width:${SIZE}px" role="img" aria-label="${esc(sources.join(", "))}">` +
    `<defs><clipPath id="mp-clip"><rect x="${PAD}" y="${PAD}" width="${inner}" height="${inner}" /></clipPath></defs>` +
    `<g clip-path="url(#mp-clip)">${parts.join("")}</g>` +
    `<rect x="${PAD}" y="${PAD}" width="${inner}" height="${inner}" fill="none" stroke="var(--color-border-strong)" stroke-width="1" />` +
    `</svg>`;

  return { svg, error: null };
}

export const MathPlot = Node.create({
  name: "mathPlot",
  group: "block",
  atom: true,

  addAttributes() {
    return {
      expr: {
        default: DEFAULTS.expr,
        parseHTML: (el) => el.getAttribute("data-expr") || DEFAULTS.expr,
        renderHTML: (attrs) => ({ "data-expr": attrs.expr }),
      },
      xMin: {
        default: DEFAULTS.xMin,
        parseHTML: (el) => Number(el.getAttribute("data-xmin")),
        renderHTML: (attrs) => ({ "data-xmin": String(attrs.xMin) }),
      },
      xMax: {
        default: DEFAULTS.xMax,
        parseHTML: (el) => Number(el.getAttribute("data-xmax")),
        renderHTML: (attrs) => ({ "data-xmax": String(attrs.xMax) }),
      },
      yMin: {
        default: DEFAULTS.yMin,
        parseHTML: (el) => Number(el.getAttribute("data-ymin")),
        renderHTML: (attrs) => ({ "data-ymin": String(attrs.yMin) }),
      },
      yMax: {
        default: DEFAULTS.yMax,
        parseHTML: (el) => Number(el.getAttribute("data-ymax")),
        renderHTML: (attrs) => ({ "data-ymax": String(attrs.yMax) }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="math-plot"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "math-plot",
        class:
          "math-plot my-4 flex justify-center rounded-lg border border-border-strong bg-surface p-4",
      }),
    ];
  },

  addNodeView() {
    return ({ node, getPos, editor }) => {
      const dom = document.createElement("div");
      dom.setAttribute("data-type", "math-plot");

      const renderPreview = () => {
        const attrs = readAttrs(node.attrs);
        const { svg, error } = renderPlotSvg(attrs);
        dom.className = "math-plot my-4 rounded-lg border border-border-strong bg-surface p-4";
        if (error) {
          dom.innerHTML = `<p class="text-center text-sm text-danger-fg">${esc(error)}</p>`;
          return;
        }
        dom.innerHTML =
          `<div class="flex justify-center">${svg}</div>` +
          `<p class="mt-2 text-center font-mono text-3xs text-text-subtle">${esc(attrs.expr)}</p>`;
      };

      const showEditor = () => {
        const attrs = readAttrs(node.attrs);
        dom.innerHTML = "";
        dom.className = "math-plot my-4 space-y-3 rounded-lg border-2 border-primary bg-surface p-4";

        const exprInput = document.createElement("input");
        exprInput.value = attrs.expr;
        exprInput.placeholder = "x^2 ; sin(x)";
        exprInput.className =
          "w-full rounded-md border border-border-strong bg-surface-2 px-3 py-2 font-mono text-sm text-text focus:border-primary focus:outline-none";

        const ranges = document.createElement("div");
        ranges.className = "grid grid-cols-4 gap-2";
        const rangeInputs = {} as Record<"xMin" | "xMax" | "yMin" | "yMax", HTMLInputElement>;
        (["xMin", "xMax", "yMin", "yMax"] as const).forEach((key) => {
          const wrap = document.createElement("label");
          wrap.className = "flex flex-col gap-1 text-3xs uppercase tracking-wide text-text-subtle";
          wrap.textContent = key;
          const input = document.createElement("input");
          input.type = "number";
          input.value = String(attrs[key]);
          input.className =
            "rounded-md border border-border-strong bg-surface-2 px-2 py-1 font-mono text-sm text-text focus:border-primary focus:outline-none";
          wrap.appendChild(input);
          ranges.appendChild(wrap);
          rangeInputs[key] = input;
        });

        const preview = document.createElement("div");
        preview.className = "flex min-h-[8rem] justify-center border-t border-border-strong pt-3";

        const current = (): MathPlotAttrs =>
          readAttrs({
            expr: exprInput.value,
            xMin: rangeInputs.xMin.value,
            xMax: rangeInputs.xMax.value,
            yMin: rangeInputs.yMin.value,
            yMax: rangeInputs.yMax.value,
          });

        const refresh = () => {
          const { svg, error } = renderPlotSvg(current());
          preview.innerHTML = error
            ? `<span class="text-sm text-danger-fg">${esc(error)}</span>`
            : svg;
        };

        const commit = () => {
          const pos = typeof getPos === "function" ? getPos() : null;
          if (pos !== null && pos !== undefined) {
            editor
              .chain()
              .focus()
              .command(({ tr }) => {
                tr.setNodeMarkup(pos, undefined, current());
                return true;
              })
              .run();
          }
          renderPreview();
        };

        exprInput.addEventListener("input", refresh);
        Object.values(rangeInputs).forEach((i) => i.addEventListener("input", refresh));
        dom.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === "Escape") {
            e.preventDefault();
            commit();
          }
        });

        const hint = document.createElement("p");
        hint.className = "text-center text-3xs text-text-subtle";
        hint.textContent = "Separate several curves with ; — press Enter to save";

        dom.append(exprInput, ranges, preview, hint);
        refresh();
        exprInput.focus();
      };

      dom.addEventListener("click", () => {
        if (!editor.isEditable) return;
        if (!dom.querySelector("input")) showEditor();
      });

      renderPreview();

      return {
        dom,
        update(updated) {
          if (updated.type.name !== "mathPlot") return false;
          if (!dom.querySelector("input")) renderPreview();
          return true;
        },
        stopEvent() {
          return true;
        },
      };
    };
  },

  addCommands() {
    return {
      setMathPlot:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs: { ...DEFAULTS, ...attrs } }),
    };
  },
});
