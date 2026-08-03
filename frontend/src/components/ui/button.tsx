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
          "inline-flex cursor-pointer touch-manipulation items-center justify-center gap-2 font-bold focus-visible:outline-none",
          {
            "btn-pop bg-primary text-primary-fg hover:bg-primary-hover":
              variant === "default",
            "btn-pop btn-pop--secondary bg-surface text-text border border-border":
              variant === "secondary",
            // press-scale only on the flat variants: .btn-pop already owns
            // `transform` on :active, so the two would overwrite each other
            "press-scale border border-border-strong bg-surface text-text hover:bg-surface-2 hover:border-border-strong transition-colors":
              variant === "outline",
            "press-scale bg-transparent text-text hover:bg-surface-2 transition-colors":
              variant === "ghost",
            "btn-pop btn-pop--clay bg-danger text-ink-900 hover:bg-danger":
              variant === "destructive",
            "btn-pop btn-pop--ink bg-ink-900 text-white hover:bg-ink-700":
              variant === "dark",
            "btn-pop btn-pop--sun bg-sun-400 text-ink-900 hover:bg-sun-300":
              variant === "sun",
          },
          {
            "h-9 px-3.5 text-xs rounded-sm": size === "sm",
            "h-10 px-5 text-sm rounded-md": size === "md",
            "h-12 px-6 text-base rounded-lg": size === "lg",
            "h-10 w-10 p-0 rounded-md": size === "icon",
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
