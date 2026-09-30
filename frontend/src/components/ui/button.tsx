import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | "default"
    | "outline"
    | "ghost"
    | "destructive"
    | "secondary"
    | "dark"
    | "sun";
  size?: "sm" | "md" | "lg" | "icon";
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex cursor-pointer touch-manipulation items-center justify-center gap-2 rounded-pill font-semibold focus-visible:outline-none",
          {
            "press-scale bg-primary text-primary-fg hover:bg-primary-hover":
              variant === "default",
            "press-scale bg-surface text-text border border-border":
              variant === "secondary",
            // press-scale only on the flat variants: .press-scale already owns
            // `transform` on :active, so the two would overwrite each other
            "press-scale border border-border-strong bg-surface text-text hover:bg-surface-2 hover:border-border-strong transition-colors":
              variant === "outline",
            "press-scale bg-transparent text-text hover:bg-surface-2 transition-colors":
              variant === "ghost",
            "press-scale bg-danger text-ink-900 hover:bg-danger":
              variant === "destructive",
            "press-scale bg-ink-900 text-white hover:bg-ink-700":
              variant === "dark",
            "press-scale bg-sun-400 text-ink-900 hover:bg-sun-300":
              variant === "sun",
          },
          {
            "h-9 px-4 text-xs": size === "sm",
            "h-11 px-5 text-sm": size === "md",
            "h-12 px-6 text-base": size === "lg",
            "h-10 w-10 p-0": size === "icon",
          },
          className
        )}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";
export { Button };
