import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

/**
 * Lively highlight marker — sun-300 background, rotated −1deg.
 * The ONLY way to mark a keyword in a headline. Do NOT use for UI status.
 */
export function Highlight({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-block px-2 rounded-lg -rotate-1",
        className
      )}
      style={{ background: "#ffe066", color: "#0a1a10" }}
      {...props}
    >
      {children}
    </span>
  );
}
