"use client";

import { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from "react";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "./button";

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "default";
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | null>(null);

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within ConfirmProvider");
  return ctx.confirm;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{
    open: boolean;
    options: ConfirmOptions;
    resolve: ((value: boolean) => void) | null;
  }>({
    open: false,
    options: { message: "" },
    resolve: null,
  });

  const confirmBtnRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({ open: true, options, resolve });
    });
  }, []);

  const handleClose = (result: boolean) => {
    state.resolve?.(result);
    setState((s) => ({ ...s, open: false, resolve: null }));
  };

  // Focus trap and keyboard handling
  useEffect(() => {
    if (!state.open) return;

    // Focus the confirm button on open
    setTimeout(() => confirmBtnRef.current?.focus(), 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose(false);
        return;
      }
      // Focus trap
      if (e.key === "Tab" && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [state.open]);

  const variantStyles = {
    danger: {
      icon: "bg-coral-50 text-coral-500",
      button: "bg-coral-500 hover:bg-coral-700 text-white",
    },
    warning: {
      icon: "bg-sun-100 text-sun-500",
      button: "bg-sun-500 hover:bg-sun-700 text-white",
    },
    default: {
      icon: "bg-green-100 text-green-600",
      button: "bg-green-600 hover:bg-green-700 text-white",
    },
  };

  const styles = variantStyles[state.options.variant || "danger"];
  const titleId = "confirm-dialog-title";
  const descId = "confirm-dialog-desc";

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {state.open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => handleClose(false)}
            aria-hidden="true"
          />
          {/* Dialog */}
          <div
            ref={dialogRef}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descId}
            className="relative mx-4 w-full max-w-md animate-in fade-in zoom-in-95 rounded-xl bg-white p-6 shadow-2xl duration-200 dark:bg-[#383838]"
          >
            <button
              onClick={() => handleClose(false)}
              className="absolute right-4 top-4 rounded-lg p-1 text-ink-400 hover:bg-ink-100 hover:text-ink-700"
              aria-label="Close dialog"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>

            <div className="flex gap-4">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${styles.icon}`}>
                <AlertTriangle className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="flex-1">
                <h3 id={titleId} className="text-base font-semibold text-ink-900 dark:text-ink-100">
                  {state.options.title || "Confirm Action"}
                </h3>
                <p id={descId} className="mt-1 text-sm text-ink-500 dark:text-ink-400">{state.options.message}</p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => handleClose(false)}
              >
                {state.options.cancelLabel || "Cancel"}
              </Button>
              <button
                ref={confirmBtnRef}
                onClick={() => handleClose(true)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${styles.button}`}
              >
                {state.options.confirmLabel || "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
