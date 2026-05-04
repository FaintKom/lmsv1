import { cn } from "@/lib/utils";
import { InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, hasError, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "flex h-11 w-full rounded-md border-2 bg-paper-2 px-4 py-2 text-sm text-text placeholder:text-ink-300 transition-colors focus:outline-none focus:ring-4 focus:ring-primary-soft disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-surface-2",
          hasError
            ? "border-danger focus:border-danger focus:ring-danger-soft"
            : "border-border focus:border-primary",
          className
        )}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";
export { Input };
