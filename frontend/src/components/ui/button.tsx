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
    | "sun"
    /** Destructive but not the point of the screen: red words, no fill until hover. */
    | "danger-ghost";
  size?: "sm" | "md" | "lg" | "icon";
}

type ButtonLook = Pick<ButtonProps, "variant" | "size" | "className">;

/**
 * The button's look, for a link that navigates. `<Link><Button/></Link>` puts
 * a button inside an anchor: two tab stops, and a screen reader announces
 * both. A link styled as a button is one control.
 */
export function buttonClass({ className, variant = "default", size = "md" }: ButtonLook = {}) {
  return cn(
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
            "press-scale bg-transparent text-danger-fg hover:bg-danger-soft transition-colors":
              variant === "danger-ghost",
          },
          {
            "h-9 px-4 text-xs": size === "sm",
            "h-11 px-5 text-sm": size === "md",
            "h-12 px-6 text-base": size === "lg",
            "h-10 w-10 p-0": size === "icon",
          },
          className
  );
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={buttonClass({ className, variant, size })} {...props} />
  )
);

Button.displayName = "Button";
export { Button };
