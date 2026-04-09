// Next.js instrumentation hook — runs once on server startup.
// https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
//
// Initializes Sentry on the server side (Node + Edge runtimes). Browser-side
// init is in instrumentation-client.ts. Both are no-ops if SENTRY_DSN /
// NEXT_PUBLIC_SENTRY_DSN is empty, so deployments without Sentry work
// without changes.

export async function register() {
  if (!process.env.SENTRY_DSN) return;

  const Sentry = await import("@sentry/nextjs");

  if (process.env.NEXT_RUNTIME === "nodejs") {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment:
        process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || "production",
      tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0.1),
      sendDefaultPii: false,
    });
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment:
        process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || "production",
      tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0.1),
      sendDefaultPii: false,
    });
  }
}
