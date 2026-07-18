import type { Metadata, Viewport } from "next";
import { Manrope, Geist_Mono } from "next/font/google";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n/context";
import { Toaster } from "@/components/ui/toaster";
import { ConfirmProvider } from "@/components/ui/confirm-dialog";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { QueryProvider } from "@/components/providers/query-provider";
import CookieConsent from "@/components/cookie-consent";

const manrope = Manrope({
 variable: "--font-manrope",
 subsets: ["latin", "cyrillic", "latin-ext"],
 weight: ["400", "500", "600", "700", "800"],
});

const geistMono = Geist_Mono({
 variable: "--font-geist-mono",
 subsets: ["latin"],
});

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
 <html lang="en">
 <head>
 <link rel="apple-touch-icon" href="/icon-192.png" />
 </head>
 <body className={`${manrope.variable} ${geistMono.variable} antialiased`}>
 <QueryProvider>
 <I18nProvider>
 <ConfirmProvider>
 <ErrorBoundary>
 {children}
 </ErrorBoundary>
 <CookieConsent />
 </ConfirmProvider>
 </I18nProvider>
 </QueryProvider>
 <Toaster />
 </body>
 </html>
 );
}
