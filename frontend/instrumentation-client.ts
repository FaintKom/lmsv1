// Next.js 16 browser instrumentation — runs in the browser on first mount.
// https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation-client
//
// Initializes Sentry in the browser. No-op if NEXT_PUBLIC_SENTRY_DSN is empty.

import * as Sentry from "@sentry/nextjs";

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment:
      process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ||
      process.env.NODE_ENV ||
      "production",
    tracesSampleRate: Number(
      process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE || 0.1
    ),
    sendDefaultPii: false,
    // Replay is heavy; leave off for free tier.
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
  });
}
