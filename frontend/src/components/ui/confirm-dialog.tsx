"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
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

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({ open: true, options, resolve });
    });
  }, []);

  const handleClose = (result: boolean) => {
    state.resolve?.(result);
    setState((s) => ({ ...s, open: false, resolve: null }));
  };

  const variantStyles = {
    danger: {
      icon: "bg-red-100 text-red-600",
      button: "bg-red-600 hover:bg-red-700 text-white",
    },
    warning: {
      icon: "bg-amber-100 text-amber-600",
      button: "bg-amber-600 hover:bg-amber-700 text-white",
    },
    default: {
      icon: "bg-indigo-100 text-indigo-600",
      button: "bg-indigo-600 hover:bg-indigo-700 text-white",
    },
  };

  const styles = variantStyles[state.options.variant || "danger"];

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {state.open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => handleClose(false)}
          />
          {/* Dialog */}
          <div className="relative mx-4 w-full max-w-md animate-in fade-in zoom-in-95 rounded-xl bg-white p-6 shadow-2xl duration-200">
            <button
              onClick={() => handleClose(false)}
              className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex gap-4">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${styles.icon}`}>
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold text-slate-900">
                  {state.options.title || "Confirm Action"}
                </h3>
                <p className="mt-1 text-sm text-slate-500">{state.options.message}</p>
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
