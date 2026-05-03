"use client";

import { ReactNode } from "react";

interface TooltipProps {
  content: string;
  children: ReactNode;
  position?: "top" | "bottom" | "left" | "right";
}

export function Tooltip({ content, children, position = "top" }: TooltipProps) {
  return (
    <div className="group/tooltip relative inline-block">
      {children}
      <div
        role="tooltip"
        className={`pointer-events-none absolute z-50 max-w-xs rounded-lg bg-[#1a2a1f] px-2.5 py-1.5 text-xs text-white opacity-0 transition-opacity duration-200 delay-150 group-hover/tooltip:opacity-100 ${positionClasses[position]}`}
      >
        {content}
        <div className={`absolute h-2 w-2 rotate-45 bg-[#1a2a1f] ${arrowClasses[position]}`} />
      </div>
    </div>
  );
}

const positionClasses: Record<string, string> = {
  top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
  bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
  left: "right-full top-1/2 -translate-y-1/2 mr-2",
  right: "left-full top-1/2 -translate-y-1/2 ml-2",
};

const arrowClasses: Record<string, string> = {
  top: "top-full left-1/2 -translate-x-1/2 -mt-1",
  bottom: "bottom-full left-1/2 -translate-x-1/2 -mb-1",
  left: "left-full top-1/2 -translate-y-1/2 -ml-1",
  right: "right-full top-1/2 -translate-y-1/2 -mr-1",
};
