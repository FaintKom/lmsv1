import type { BrowserContext, Page } from "@playwright/test";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
const API_URL = process.env.PLAYWRIGHT_API_URL ?? "http://localhost:8000";

/**
 * QA-role credentials. Mirrors scripts/seed_qa.py - methodist is a teacher
 * with is_methodist=True (no separate enum value).
 */
const CREDS = {
  student:   { email: "qa-student@qa.example.com",   password: "qa-test-not-for-prod" },
  teacher:   { email: "qa-teacher@qa.example.com",   password: "qa-test-not-for-prod" },
  methodist: { email: "qa-methodist@qa.example.com", password: "qa-test-not-for-prod" },
  admin:     { email: "qa-admin@qa.example.com",     password: "qa-test-not-for-prod" },
} as const;

export type QaRole = keyof typeof CREDS;

export interface TokenBundle {
  access_token: string;
  refresh_token: string;
  user: { id: string; role: string; email: string };
}

export class LoginPage {
  constructor(private page: Page) {}

  /** Drive the actual login form. Slower but covers the form UI itself. */
  async loginViaUi(role: QaRole): Promise<void> {
    const { email, password } = CREDS[role];
    await this.page.goto(`${BASE_URL}/login`);
    await this.page.locator('input[type="email"]').fill(email);
    await this.page.locator('input[type="password"]').fill(password);
    await this.page.getByRole("button", { name: /sign in/i }).click();
    // Either /admin (admin / teacher / methodist) or /dashboard (student).
    await this.page.waitForURL(/\/(admin|dashboard)(\/|$)/, { timeout: 15_000 });
  }

  /**
   * Skip the form, log in via the API, write tokens into localStorage so
   * the SPA treats the session as authenticated.
   *
   * Use this when the test under test is NOT the login flow itself.
   *
   * Tokens are cached at module level (see `LoginPage._tokenCache`)
   * because /auth/login is rate-limited 5/min/IP and a full lifecycle
   * sweep produces ~48 logins in a few seconds.
   */
  async loginViaApi(context: BrowserContext, role: QaRole): Promise<TokenBundle> {
    const cached = LoginPage._tokenCache.get(role);
    let tokens: TokenBundle;
    if (cached) {
      tokens = cached;
    } else {
      const { email, password } = CREDS[role];
      const res = await context.request.post(`${API_URL}/api/v1/auth/login`, {
        data: { email, password },
      });
      if (!res.ok()) {
        throw new Error(`loginViaApi(${role}): ${res.status()} ${await res.text()}`);
      }
      tokens = (await res.json()) as TokenBundle;
      LoginPage._tokenCache.set(role, tokens);
    }
    await context.addInitScript((t) => {
      window.localStorage.setItem("access_token", t.access_token);
      window.localStorage.setItem("refresh_token", t.refresh_token);
    }, tokens);
    return tokens;
  }

  /**
   * Process-wide token cache. One bundle per role. Survives across tests
   * because Playwright runs them in the same Node worker; isolated only
   * across `--workers N` boundaries (each worker has its own module
   * graph, so the cache repopulates per-worker on first miss).
   */
  private static _tokenCache: Map<QaRole, TokenBundle> = new Map();
}
