import Link from "next/link";

export default function NotFound() {
 return (
   <div className="flex min-h-screen flex-col items-center justify-center bg-surface-primary px-4">
     <div className="text-center">
       <div className="mb-6 flex items-center justify-center gap-2">
         <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-white font-bold text-lg">
           g
         </div>
         <span className="text-xl font-semibold text-text-primary">GrassLMS</span>
       </div>
       <h1 className="mb-2 text-6xl font-bold text-text-primary">404</h1>
       <p className="mb-6 text-lg text-text-secondary">
         This page could not be found.
       </p>
       <Link
         href="/dashboard"
         className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-primary/90"
       >
         Back to Dashboard
       </Link>
     </div>
   </div>
 );
}
