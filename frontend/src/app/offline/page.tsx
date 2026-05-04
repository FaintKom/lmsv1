"use client";

import { WifiOff } from "lucide-react";

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white p-6 dark:bg-[#1E1E1E]">
      <div className="text-center">
        <WifiOff className="mx-auto mb-4 h-16 w-16 text-ink-300" />
        <h1 className="mb-2 text-2xl font-bold text-ink-900 dark:text-ink-100">
          You&apos;re offline
        </h1>
        <p className="mb-6 text-ink-500 dark:text-ink-400">
          Check your internet connection and try again. Previously visited
          pages may still be available.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="rounded-lg bg-green-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-green-500"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
