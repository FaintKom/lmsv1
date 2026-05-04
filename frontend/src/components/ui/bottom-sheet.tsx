"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
}

/**
 * Mobile-optimised bottom sheet. Slides up from the bottom on phones
 * (<768px) and renders as a centered dialog overlay on desktop.
 *
 * Supports:
 * - Backdrop click to dismiss
 * - Escape key to dismiss
 * - Overscroll containment (doesn't bleed into parent scroll)
 * - Safe area padding for notched phones
 * - Focus trap (basic: focuses the sheet on open)
 */
export function BottomSheet({ open, onClose, title, children, className }: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    sheetRef.current?.focus();
    // Prevent background scrolling
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center md:items-center"
      aria-modal="true"
      role="dialog"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Sheet */}
      <div
        ref={sheetRef}
        tabIndex={-1}
        className={cn(
          "relative z-10 w-full max-h-[85vh] overflow-y-auto overscroll-contain rounded-t-2xl bg-white pb-[env(safe-area-inset-bottom)] shadow-2xl dark:bg-[#2C2C2C]",
          "md:max-w-md md:rounded-2xl md:pb-0",
          "animate-in slide-in-from-bottom duration-200 md:fade-in md:zoom-in-95",
          className,
        )}
      >
        {/* Drag handle (mobile) */}
        <div className="flex justify-center py-3 md:hidden">
          <div className="h-1 w-10 rounded-full bg-ink-300 dark:bg-ink-700" />
        </div>
        {title && (
          <div className="border-b border-ink-100 px-6 pb-3 pt-1 dark:border-white/10 md:pt-5">
            <h2 className="text-lg font-bold text-ink-900 dark:text-ink-100">{title}</h2>
          </div>
        )}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
