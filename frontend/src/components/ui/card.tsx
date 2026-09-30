import { cn } from "@/lib/utils";
import { HTMLAttributes, forwardRef, ElementType } from "react";
import { SUBJECT_SURFACE, type Subject } from "@/lib/subject";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "elevated" | "flat" | "subject";
  /** Field colour for `variant="subject"`; see src/lib/subject.ts. */
  subject?: Subject;
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = "default", subject = "other", ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        // MOTION.md §5: never `transition: all` — a bare `transition` animates
        // layout properties too, so any width change slides the card
        "rounded-lg transition-[box-shadow,border-color,background-color] duration-[var(--motion-base)] ease-[var(--motion-ease)]",
        {
          "bg-surface": variant === "default",
          "bg-surface shadow-md": variant === "elevated",
          "bg-surface-2": variant === "flat",
          [`${SUBJECT_SURFACE[subject]} text-subject-ink`]: variant === "subject",
        },
        className
      )}
      {...props}
    />
  )
);
Card.displayName = "Card";

const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("px-6 pt-6 pb-2", className)} {...props} />
  )
);
CardHeader.displayName = "CardHeader";

interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  as?: ElementType;
}

const CardTitle = forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ className, as: Tag = "h4", ...props }, ref) => {
    const Comp = Tag as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    return (
      <Comp
        ref={ref}
        className={cn("text-md font-semibold text-text mb-1.5", className)}
        {...props}
      />
    );
  }
);
CardTitle.displayName = "CardTitle";

const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("px-6 pb-6 pt-4 text-sm text-text-muted", className)} {...props} />
  )
);
CardContent.displayName = "CardContent";

export { Card, CardHeader, CardTitle, CardContent };
