"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("cookie-consent") !== "accepted") {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  const handleAccept = () => {
    localStorage.setItem("cookie-consent", "accepted");
    setVisible(false);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white px-4 py-3 shadow-lg dark:border-white/10 dark:bg-[#2C2C2C]">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          This site uses essential cookies for functionality only. No tracking cookies are used.{" "}
          <Link href="/cookies" className="underline hover:text-slate-800 dark:hover:text-slate-200">
            Learn more
          </Link>
        </p>
        <button
          onClick={handleAccept}
          className="shrink-0 rounded-lg bg-green-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-green-700"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
