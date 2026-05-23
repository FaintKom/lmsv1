/**
 * GridAxes — shared SVG axis/grid helper for math template components.
 *
 * Used by CoordinatePlaneV2, FunctionGraphV2, ScatterPlotV2,
 * InequalityGraphV2, GraphTransformV2. Renders a centered xy plane
 * with light grid lines, axes, arrowheads, and tick labels.
 *
 * Adopted from q-math-templates.jsx · GridAxes helper.
 */

export interface GridAxesProps {
  range: number;
  size: number;
  pad: number;
  showOrigin?: boolean;
  ticks?: boolean;
}

export function GridAxes({
  range,
  size,
  pad,
  showOrigin = true,
  ticks = true,
}: GridAxesProps) {
  const scale = (size - pad * 2) / (range * 2);
  const toX = (v: number) => pad + (v + range) * scale;
  const toY = (v: number) => pad + (range - v) * scale;
  return (
    <>
      {Array.from({ length: range * 2 + 1 }, (_, i) => {
        const v = -range + i;
        return (
          <g key={v}>
            <line
              x1={toX(v)}
              y1={pad}
              x2={toX(v)}
              y2={size - pad}
              stroke="var(--ink-100)"
              strokeWidth={v === 0 ? 0 : 1}
            />
            <line
              x1={pad}
              y1={toY(v)}
              x2={size - pad}
              y2={toY(v)}
              stroke="var(--ink-100)"
              strokeWidth={v === 0 ? 0 : 1}
            />
          </g>
        );
      })}
      {/* axes */}
      <line
        x1={pad}
        y1={toY(0)}
        x2={size - pad}
        y2={toY(0)}
        stroke="var(--ink-500)"
        strokeWidth="1.5"
      />
      <line
        x1={toX(0)}
        y1={pad}
        x2={toX(0)}
        y2={size - pad}
        stroke="var(--ink-500)"
        strokeWidth="1.5"
      />
      {/* arrows */}
      <polygon
        points={`${size - pad},${toY(0)} ${size - pad - 8},${toY(0) - 5} ${size - pad - 8},${toY(0) + 5}`}
        fill="var(--ink-500)"
      />
      <polygon
        points={`${toX(0)},${pad} ${toX(0) - 5},${pad + 8} ${toX(0) + 5},${pad + 8}`}
        fill="var(--ink-500)"
      />
      {ticks &&
        Array.from({ length: range * 2 + 1 }, (_, i) => {
          const v = -range + i;
          if (v === 0) return null;
          return (
            <g key={v}>
              <text
                x={toX(v)}
                y={toY(0) + 16}
                fontSize="11"
                fontFamily="var(--font-mono)"
                textAnchor="middle"
                fill="var(--ink-500)"
              >
                {v}
              </text>
              <text
                x={toX(0) - 8}
                y={toY(v) + 4}
                fontSize="11"
                fontFamily="var(--font-mono)"
                textAnchor="end"
                fill="var(--ink-500)"
              >
                {v}
              </text>
            </g>
          );
        })}
      {showOrigin && (
        <text
          x={toX(0) - 8}
          y={toY(0) + 16}
          fontSize="11"
          fontFamily="var(--font-mono)"
          textAnchor="end"
          fill="var(--ink-500)"
        >
          0
        </text>
      )}
    </>
  );
}
