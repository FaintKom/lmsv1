import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

/**
 * Marks a keyword in a headline with the primary colour. Until specs/071 this
 * was a sun-300 marker rotated −1deg; a highlighter over headline words is one
 * of the looks the spec lists as generated, so the emphasis is colour only.
 */
export function Highlight({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn("text-primary", className)}
      {...props}
    >
      {children}
    </span>
  );
}
