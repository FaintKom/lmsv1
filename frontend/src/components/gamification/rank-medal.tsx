import type { CSSProperties } from "react";

type Rank = 1 | 2 | 3;

const PALETTE: Record<Rank, { face: string; stroke: string; ribbon: string }> = {
  1: { face: "#ffd84d", stroke: "#7a5500", ribbon: "#e8a93b" },
  2: { face: "#dde2e6", stroke: "#5b6770", ribbon: "#9aa3ab" },
  3: { face: "#e8a87c", stroke: "#7a3f1a", ribbon: "#c2643b" },
};

interface RankMedalProps {
  rank: Rank;
  size?: number;
  className?: string;
  style?: CSSProperties;
}

export function RankMedal({ rank, size = 28, className, style }: RankMedalProps) {
  const c = PALETTE[rank] ?? PALETTE[2];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      style={style}
      role="img"
      aria-label={`Rank ${rank}`}
    >
      <path d="M8 2 4 11l4 1 3-6Z" fill={c.ribbon} />
      <path d="M24 2l4 9-4 1-3-6Z" fill={c.ribbon} />
      <circle cx="16" cy="19" r="10" fill={c.face} stroke={c.stroke} strokeWidth="1.4" />
      <circle cx="16" cy="19" r="6.5" fill="none" stroke={c.stroke} strokeWidth="0.8" opacity="0.55" />
      <text
        x="16"
        y="22.5"
        textAnchor="middle"
        fontFamily="Manrope, sans-serif"
        fontWeight="800"
        fontSize="10"
        fill={c.stroke}
      >
        {rank}
      </text>
    </svg>
  );
}
