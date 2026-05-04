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
 },
 }}
 richColors
 closeButton
 duration={4000}
 />
 );
}
