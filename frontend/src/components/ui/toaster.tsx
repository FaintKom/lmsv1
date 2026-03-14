"use client";

import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      toastOptions={{
        style: {
          fontSize: "14px",
        },
        classNames: {
          success: "border-emerald-200 bg-emerald-50 text-emerald-800",
          error: "border-red-200 bg-red-50 text-red-800",
        },
      }}
      richColors
      closeButton
      duration={4000}
    />
  );
}
