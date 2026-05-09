import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <a
        href="#auth-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>

      {/* Left side — branding with Lively gradient */}
      <div
        className="hidden w-1/2 lg:flex lg:flex-col lg:items-center lg:justify-center"
        style={{
          background:
            "radial-gradient(circle at 30% 20%, var(--green-600), var(--ink-900))",
        }}
      >
        <div className="max-w-md px-8 text-center">
          {/* "g" logo mark */}
          <div className="relative mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-[14px] bg-green-500 text-[32px] font-extrabold text-white">
            g
            <span className="absolute bottom-[6px] right-[8px] h-[8px] w-[8px] rounded-full bg-sun-400" />
          </div>
          <h2 className="mb-3 text-[28px] font-extrabold tracking-tight text-white">
            GrassLMS
          </h2>
          <p className="text-[15px] leading-relaxed text-white/70">
            The modern learning platform for schools and online courses.
            Programming, languages, and mathematics.
          </p>
        </div>
      </div>

      {/* Right side — form */}
      <div className="flex w-full items-center justify-center bg-paper px-6 lg:w-1/2">
        <div id="auth-content" className="w-full max-w-md">
          {/* Mobile logo */}
          <Link
            href="/"
            className="mb-8 flex items-center justify-center gap-2.5 lg:hidden"
          >
            <div className="relative flex h-9 w-9 items-center justify-center rounded-[10px] bg-green-500 text-lg font-extrabold text-white">
              g
              <span className="absolute bottom-[4px] right-[5px] h-[5px] w-[5px] rounded-full bg-sun-400" />
            </div>
            <span className="text-[18px] font-extrabold tracking-tight text-text">
              GrassLMS
            </span>
          </Link>
          {children}
        </div>
      </div>
    </div>
  );
}
