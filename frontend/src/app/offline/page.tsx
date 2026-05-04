"use client";

import { WifiOff } from "lucide-react";

export default function OfflinePage() {
 return (
 <div className="flex min-h-screen items-center justify-center bg-paper-2 p-6 ">
 <div className="text-center">
 <WifiOff className="mx-auto mb-4 h-16 w-16 text-ink-300" />
 <h1 className="mb-2 text-2xl font-bold text-text ">
 You&apos;re offline
 </h1>
 <p className="mb-6 text-text-muted ">
 Check your internet connection and try again. Previously visited
 pages may still be available.
 </p>
 <button
 onClick={() => window.location.reload()}
 className="rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary"
 >
 Try again
 </button>
 </div>
 </div>
 );
}
