import { GraduationCap } from "lucide-react";
import Link from "next/link";

export default function AuthLayout({
 children,
}: {
 children: React.ReactNode;
}) {
 return (
 <div className="flex min-h-screen">
 <a href="#auth-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-white">Skip to content</a>
 {/* Left side - branding */}
 <div className="hidden w-1/2 bg-gradient-to-br from-green-600 via-green-700 to-emerald-800 lg:flex lg:flex-col lg:items-center lg:justify-center">
 <div className="max-w-md px-8 text-center">
 <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-lg bg-paper-2/10 backdrop-blur-sm">
 <GraduationCap className="h-8 w-8 text-white" />
 </div>
 <h2 className="mb-3 text-3xl font-bold text-white">GrassLMS</h2>
 <p className="text-lg leading-relaxed text-white/70">
 The modern learning platform for schools and online courses.
 Programming, languages, and mathematics.
 </p>
 </div>
 </div>
 {/* Right side - form */}
 <div className="flex w-full items-center justify-center bg-surface-2 px-6 lg:w-1/2 ">
 <div id="auth-content" className="w-full max-w-md">
 <Link
 href="/"
 className="mb-8 flex items-center justify-center gap-2 lg:hidden"
 >
 <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
 <GraduationCap className="h-5 w-5 text-white" />
 </div>
 <span className="text-xl font-bold text-text ">GrassLMS</span>
 </Link>
 {children}
 </div>
 </div>
 </div>
 );
}
