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
 <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border-strong bg-surface px-4 py-3 shadow-lg ">
 {/* min-w-0 on the text: a flex child will not shrink below its content by
     default, so at 320px the German copy pushed the banner to 367px and took
     the whole page sideways with it. */}
 <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
 <p className="min-w-0 flex-1 text-sm text-text-muted">
 {t("cookie.message")}{" "}
 <Link href="/cookies" className="underline hover:text-text ">
 {t("cookie.learnMore")}
 </Link>
 </p>
 <button
 onClick={handleAccept}
 className="shrink-0 rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-primary-fg transition-colors hover:bg-primary-hover"
 >
 {t("cookie.accept")}
 </button>
 </div>
 </div>
 );
}
