import { cn } from "@/lib/utils";
import { HTMLAttributes, forwardRef, ElementType } from "react";

const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-2xl border border-ink-200/60 bg-white shadow-sm transition-all duration-200 dark:border-white/10 dark:bg-[#2C2C2C] dark:shadow-none",
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
  ({ className, as: Tag = "h3", ...props }, ref) => {
    const Comp = Tag as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    return (
      <Comp
        ref={ref}
        className={cn("text-lg font-semibold text-ink-900 dark:text-ink-100", className)}
        {...props}
      />
    );
  }
);
CardTitle.displayName = "CardTitle";

const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("px-6 pb-6 pt-4", className)} {...props} />
  )
);
CardContent.displayName = "CardContent";

export { Card, CardHeader, CardTitle, CardContent };
