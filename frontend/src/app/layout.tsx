import type { Metadata, Viewport } from "next";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n/context";
import { Toaster } from "@/components/ui/toaster";
import { ConfirmProvider } from "@/components/ui/confirm-dialog";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { QueryProvider } from "@/components/providers/query-provider";
import { CallProvider } from "@/components/live/call-provider";
import CookieConsent from "@/components/cookie-consent";

// Fonts are self-hosted via @font-face in globals.css — see the note there
// for why they no longer come from next/font/google.

export const viewport: Viewport = {
 width: "device-width",
 initialScale: 1,
 viewportFit: "cover",
 // WCAG 2.1 SC 1.4.4 "Resize text" — users must be able to zoom. Do NOT
 // set maximumScale/userScalable: false. Zoom up to 5x is the spec
 // requirement and the browser default is fine.
 themeColor: "#0a8754",
};

export const metadata: Metadata = {
 title: "GrassLMS — Modern Learning Platform",
 description: "A powerful LMS for schools and online courses. Programming, languages, and mathematics.",
 manifest: "/manifest.json",
 appleWebApp: {
 capable: true,
 statusBarStyle: "default",
 title: "GrassLMS",
 },
};

export default function RootLayout({
 children,
}: Readonly<{
 children: React.ReactNode;
}>) {
 return (
 <html lang="en" suppressHydrationWarning>
 <head>
 {/* Theme contract (frontend/design/README.md): `.dark` on <html>,
     choice persisted in localStorage["lms.theme"]. This runs before
     paint so the first frame is already in the right theme.
     suppressHydrationWarning above: the class is set pre-hydration. */}
 <script
 dangerouslySetInnerHTML={{
 __html: `(function () {
  var t = localStorage.getItem('lms.theme') || 'system';
  var dark = t === 'dark' || (t === 'system' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', dark);
})();`,
 }}
 />
  {/* The school's name and icon, before the first frame. Same trick as the
      theme script above, for the same reason: read this in an effect instead
      and every page load flashes "GrassLMS" at a pupil whose school is not
      called that. Written by BrandVars once /me answers; absent until then,
      and absent forever for a school that set nothing, in which case the
      metadata above stands. */}
  <script
   dangerouslySetInnerHTML={{
    __html: `(function () {
  try {
    var n = localStorage.getItem('school-name');
    if (n) document.title = n;
    var f = localStorage.getItem('school-favicon');
    if (f) {
      var l = document.querySelector("link[rel='icon']") || document.createElement('link');
      l.rel = 'icon';
      l.href = f;
      document.head.appendChild(l);
    }
  } catch (e) {}
})();`,
   }}
  />
 <link rel="apple-touch-icon" href="/icon-192.png" />
 </head>
 <body className="antialiased">
 <QueryProvider>
 <I18nProvider>
 <ConfirmProvider>
 {/* Above the router on purpose: a call mounted inside a page hangs up
     the moment somebody opens a material or a task (FR-033). */}
 <CallProvider>
 <ErrorBoundary>
 {children}
 </ErrorBoundary>
 </CallProvider>
 <CookieConsent />
 </ConfirmProvider>
 </I18nProvider>
 </QueryProvider>
 <Toaster />
 </body>
 </html>
 );
}
