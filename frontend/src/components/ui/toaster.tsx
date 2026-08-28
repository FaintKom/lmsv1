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
 success: "border-primary-soft bg-success-soft text-success-fg",
 error: "border-danger bg-danger-soft text-danger-fg",
          // Sonner ships a 20x20 close button. On a phone that is under the
          // WCAG 2.2 minimum, and it is the control people reach for most
          // often — a toast covers what they were reading (specs/065).
          closeButton: "h-6 w-6",
 },
 }}
 richColors
 closeButton
 duration={4000}
 />
 );
}
