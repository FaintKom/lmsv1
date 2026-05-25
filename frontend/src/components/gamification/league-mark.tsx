import type { CSSProperties } from "react";

export type LeagueKind = "bronze" | "silver" | "gold" | "platinum" | "diamond";

export function leagueKindFromName(name: string | null | undefined): LeagueKind {
  const key = (name ?? "").toLowerCase();
  if (key === "silver") return "silver";
  if (key === "gold") return "gold";
  if (key === "platinum") return "platinum";
  if (key === "diamond") return "diamond";
  return "bronze";
}

const RIBBON: Record<"bronze" | "silver" | "gold", { fill: string; stroke: string; accent: string }> = {
  bronze: { fill: "#e8a87c", stroke: "#7a3f1a", accent: "#c2643b" },
  silver: { fill: "#dde2e6", stroke: "#5b6770", accent: "#9aa3ab" },
  gold: { fill: "#ffd84d", stroke: "#7a5500", accent: "#e8a93b" },
};

interface LeagueMarkProps {
  kind: LeagueKind;
  size?: number;
  className?: string;
  style?: CSSProperties;
}

export function LeagueMark({ kind, size = 40, className, style }: LeagueMarkProps) {
  const svgProps = {
    width: size,
    height: size,
    viewBox: "0 0 40 40",
    fill: "none",
    className,
    style,
    role: "img" as const,
    "aria-label": `${kind} league`,
  };

  if (kind === "platinum") {
    return (
      <svg {...svgProps}>
        <path d="M14 4h12l8 8v12l-8 8H14l-8-8V12Z" fill="#cdd9ff" stroke="#3358a6" strokeWidth="1.5" />
        <path d="M14 4h12l8 8v12l-8 8H14l-8-8V12Z" fill="url(#plat)" opacity="0.6" />
        <defs>
          <linearGradient id="plat" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fff" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#3358a6" stopOpacity="0.2" />
          </linearGradient>
        </defs>
        <path d="M14 20l4-5 2 3 2-5 4 7Z" fill="#3358a6" opacity="0.7" />
        <circle cx="26" cy="26" r="2" fill="#3358a6" />
      </svg>
    );
  }

  if (kind === "diamond") {
    return (
      <svg {...svgProps}>
        <path d="M10 13h20l-10 22Z" fill="#7ad8ff" stroke="#155b73" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M10 13l5-7h10l5 7" fill="#a8e8ff" stroke="#155b73" strokeWidth="1.5" strokeLinejoin="round" />
        <path
          d="M15 6l5 7 5-7M10 13l10 22 10-22M15 13l5 22 5-22"
          stroke="#155b73"
          strokeWidth="1"
          strokeLinejoin="round"
        />
        <path d="M11 13l4-6 5 6-5 5Z" fill="#fff" opacity="0.45" />
      </svg>
    );
  }

  const c = RIBBON[kind];
  return (
    <svg {...svgProps}>
      <path d="M11 4 4 14l5 2 4-7Z" fill={c.accent} />
      <path d="M29 4l7 10-5 2-4-7Z" fill={c.accent} stroke={c.stroke} strokeWidth="0.5" />
      <path d="M9 16l3-4 8 0 8 0 3 4-3 4-8 0-8 0-3-4Z" opacity="0.18" fill={c.stroke} />
      <circle cx="20" cy="24" r="11" fill={c.fill} stroke={c.stroke} strokeWidth="1.5" />
      <circle cx="20" cy="24" r="7.5" fill="none" stroke={c.stroke} strokeWidth="1" opacity="0.6" />
      <path
        d="M20 19l1.6 3.4 3.7.4-2.8 2.5.8 3.7L20 27.2 16.7 29l.8-3.7-2.8-2.5 3.7-.4Z"
        fill={c.stroke}
        opacity="0.55"
      />
    </svg>
  );
}
