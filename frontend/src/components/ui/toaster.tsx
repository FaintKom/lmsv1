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
          success: "border-green-200 bg-green-50 text-green-800",
          error: "border-coral-300 bg-coral-50 text-coral-700",
        },
      }}
      richColors
      closeButton
      duration={4000}
    />
  );
}
