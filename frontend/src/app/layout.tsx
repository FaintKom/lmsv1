import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n/context";
import { Toaster } from "@/components/ui/toaster";
import { ConfirmProvider } from "@/components/ui/confirm-dialog";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import CookieConsent from "@/components/cookie-consent";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin", "cyrillic", "latin-ext"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // WCAG 2.1 SC 1.4.4 "Resize text" — users must be able to zoom. Do NOT
  // set maximumScale/userScalable: false. Zoom up to 5x is the spec
  // requirement and the browser default is fine.
  themeColor: "#4f46e5",
};

export const metadata: Metadata = {
  title: "LearnHub — Modern Learning Platform",
  description: "A powerful LMS for schools and online courses. Programming, languages, and mathematics.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "LearnHub",
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
        <script dangerouslySetInnerHTML={{ __html: `
  (function() {
    var theme = localStorage.getItem('theme');
    if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    }
    // P2-6: Register service worker for PWA/offline support
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', function() {
        navigator.serviceWorker.register('/sw.js').catch(function() {});
      });
    }
  })();
` }} />
      </head>
      <body className={`${inter.variable} antialiased`}>
        <I18nProvider>
          <ConfirmProvider>
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
          </ConfirmProvider>
        </I18nProvider>
        <Toaster />
        <CookieConsent />
      </body>
    </html>
  );
}
