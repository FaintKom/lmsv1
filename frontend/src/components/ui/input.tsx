import { cn } from "@/lib/utils";
import { InputHTMLAttributes, forwardRef } from "react";

const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "flex h-11 w-full rounded-xl border border-ink-200 bg-white px-4 py-2 text-sm text-ink-900 placeholder:text-ink-400 transition-colors focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-400/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/20 dark:bg-[#2C2C2C] dark:text-ink-200 dark:placeholder:text-ink-500 dark:focus:border-green-400",
          className
        )}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";
export { Input };
