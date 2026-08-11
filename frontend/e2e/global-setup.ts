/**
 * Preflight — prove the app under test talks to the backend we think it does.
 *
 * On 2026-08-11 a local QA run reused a 2026-05-22 frontend image whose
 * /api/* rewrite was baked to https://grasslms.online. Every UI test logged a
 * qa-* account into PRODUCTION, got "Invalid email or password", and the suite
 * reported 36 unrelated-looking failures. The real cause took an hour to find.
 *
 * One login through baseURL separates that class of failure from real bugs:
 * if the configured account cannot log in, the suite stops immediately and
 * names the two things that are actually wrong (wrong backend, or no seed)
 * instead of failing 36 times for reasons that all look like product bugs.
 *
 * Deliberately loose: it only asserts "the configured account can log in via
 * baseURL", so it is equally valid against the QA stack, a dev server or prod.
 * With no credentials configured it does nothing — the specs skip themselves.
 */

const EMAIL = process.env.E2E_TEACHER_EMAIL ?? process.env.E2E_STUDENT_EMAIL;
const PASSWORD = process.env.E2E_TEACHER_PASSWORD ?? process.env.E2E_STUDENT_PASSWORD;

export default async function globalSetup() {
  if (!EMAIL || !PASSWORD) return;

  const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";
  const url = `${baseURL}/api/v1/auth/login`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
    });
  } catch (e) {
    throw new Error(
      `Preflight failed: nothing answered ${url} (${(e as Error).message}).\n` +
        `Is the frontend running on ${baseURL}, and does it proxy /api/* to a backend?`,
    );
  }

  if (res.ok) return;

  throw new Error(
    `Preflight failed: ${EMAIL} could not log in via ${url} (HTTP ${res.status}).\n` +
      `The suite is stopping here rather than reporting this as dozens of product bugs.\n` +
      `Two usual causes:\n` +
      `  1. The app under test proxies /api/* to the WRONG backend. The rewrite\n` +
      `     target is baked in at build time, so a stale image keeps its old one.\n` +
      `     Check:   docker compose -f docker-compose.qa.yml exec frontend \\\n` +
      `                grep -o 'https://[a-z.]*' .next/routes-manifest.json\n` +
      `     Fix:     docker compose -f docker-compose.qa.yml up -d --build --wait\n` +
      `  2. The seed has not run against that backend, so the account does not\n` +
      `     exist:  python scripts/seed_qa.py\n`,
  );
}
