"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n/context";

export default function CookieConsent() {
 const { t } = useTranslation();
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
 <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border-strong bg-paper-2 px-4 py-3 shadow-lg ">
 <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
 <p className="text-sm text-text-muted ">
 {t("cookie.message")}{" "}
 <Link href="/cookies" className="underline hover:text-ink-700 ">
 {t("cookie.learnMore")}
 </Link>
 </p>
 <button
 onClick={handleAccept}
 className="shrink-0 rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-primary-hover"
 >
 {t("cookie.accept")}
 </button>
 </div>
 </div>
 );
}
