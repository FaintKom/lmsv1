import { cn } from "@/lib/utils";
import { HTMLAttributes, forwardRef, ElementType } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "elevated" | "flat";
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = "default", ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-lg transition-all duration-200",
        {
          "bg-paper-2 border border-border shadow-sm": variant === "default",
          "bg-paper-2 shadow-md": variant === "elevated",
          "bg-surface-2": variant === "flat",
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
        className={cn("text-md font-bold text-text mb-1.5", className)}
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
