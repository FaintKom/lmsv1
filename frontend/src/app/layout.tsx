import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n/context";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin", "cyrillic", "latin-ext"],
});

export const metadata: Metadata = {
  title: "LearnHub — Modern Learning Platform",
  description: "A powerful LMS for schools and online courses. Programming, languages, and mathematics.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} antialiased`}>
        <I18nProvider>
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
