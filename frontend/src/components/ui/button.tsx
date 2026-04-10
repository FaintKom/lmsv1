import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "destructive" | "secondary";
  size?: "sm" | "md" | "lg" | "icon";
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex cursor-pointer touch-manipulation items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97]",
          {
            "bg-green-600 text-white shadow-md shadow-green-200 hover:bg-green-700 hover:shadow-lg hover:shadow-green-200 dark:bg-green-500 dark:hover:bg-green-400 dark:shadow-none":
              variant === "default",
            "border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 hover:border-slate-300 dark:border-white/20 dark:bg-transparent dark:text-slate-200 dark:hover:bg-white/10":
              variant === "outline",
            "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/10":
              variant === "ghost",
            "bg-red-600 text-white shadow-md shadow-red-200 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-400 dark:shadow-none":
              variant === "destructive",
            "bg-green-50 text-green-700 hover:bg-green-100 dark:bg-white/10 dark:text-slate-200":
              variant === "secondary",
          },
          {
            "h-9 px-3 text-xs": size === "sm",
            "h-10 px-5 text-sm": size === "md",
            "h-12 px-8 text-base": size === "lg",
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
