import type { APIRequestContext, BrowserContext, Page } from "@playwright/test";

/**
 * Harness for the "all content types" E2E sweep.
 *
 * Credentials + base URL are read from env so no secrets live in the repo:
 *   E2E_BASE_URL          (default http://localhost:3000)
 *   E2E_TEACHER_EMAIL / E2E_TEACHER_PASSWORD
 *   E2E_STUDENT_EMAIL / E2E_STUDENT_PASSWORD
 *
 * The browser talks to <base>/api/v1/* (Next.js rewrites proxy /api to the
 * backend in every deployment), so the API base is derived from baseURL.
 */
export const BASE_URL = (process.env.E2E_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
export const API_BASE = `${BASE_URL}/api/v1`;

export const TEACHER = {
  email: process.env.E2E_TEACHER_EMAIL ?? "teacher@grasslms.online",
  password: process.env.E2E_TEACHER_PASSWORD ?? "",
};
export const STUDENT = {
  email: process.env.E2E_STUDENT_EMAIL ?? "student@grasslms.online",
  password: process.env.E2E_STUDENT_PASSWORD ?? "",
};
// Defaults to the deterministic QA account (same one LoginPage and
// scripts/seed_qa.py use) — committed on purpose, never a prod credential.
export const ADMIN = {
  email: process.env.E2E_ADMIN_EMAIL ?? "qa-admin@qa.example.com",
  password: process.env.E2E_ADMIN_PASSWORD ?? "qa-test-not-for-prod",
};
export const PARENT = {
  email: process.env.E2E_PARENT_EMAIL ?? "qa-parent@qa.example.com",
  password: process.env.E2E_PARENT_PASSWORD ?? "qa-test-not-for-prod",
};

export interface Tokens {
  access_token: string;
  refresh_token: string;
  user: { id: string; role: string; email: string };
}

/** Log in via the API. Cached per-email — /auth/login is rate-limited 5/min/IP. */
const _tokenCache = new Map<string, Tokens>();
export async function apiLogin(
  request: APIRequestContext,
  creds: { email: string; password: string },
): Promise<Tokens> {
  const cached = _tokenCache.get(creds.email);
  if (cached) return cached;
  const res = await request.post(`${API_BASE}/auth/login`, {
    data: { email: creds.email, password: creds.password },
  });
  if (!res.ok()) {
    throw new Error(`apiLogin(${creds.email}): ${res.status()} ${await res.text()}`);
  }
  const tokens = (await res.json()) as Tokens;
  _tokenCache.set(creds.email, tokens);
  return tokens;
}

/** Log in so the browser context carries a real session.
 *
 * This used to write access_token/refresh_token into localStorage. Sessions
 * moved to httpOnly cookies on 2026-07-19 (see frontend/CLAUDE.md — tokens in
 * localStorage are forbidden, XSS must not be able to steal a session), so
 * that stopped authenticating anything: every student page bounced to /login
 * and all twelve content-type tests failed against a page that never rendered.
 *
 * context.request shares its cookie jar with the context's pages, so logging
 * in through it leaves those pages authenticated.
 */
export async function authenticate(
  context: BrowserContext,
  creds: { email: string; password: string },
): Promise<void> {
  const res = await context.request.post(`${API_BASE}/auth/login`, {
    data: { email: creds.email, password: creds.password },
  });
  if (!res.ok()) {
    throw new Error(`authenticate(${creds.email}): ${res.status()} ${await res.text()}`);
  }
}

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

/**
 * An HTTP failure that still knows its status code.
 *
 * The message carries the response body, so matching "500" in the text would
 * also match a server that merely mentions the number (specs/044).
 */
export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "ApiError";
  }
}

async function expectOk(
  res: { ok(): boolean; status(): number; text(): Promise<string> },
  label: string,
) {
  if (!res.ok()) throw new ApiError(`${label}: ${res.status()} ${await res.text()}`, res.status());
}

/** Thin API client over the verified backend endpoints the editor/builders call. */
export class Api {
  constructor(private request: APIRequestContext, private token: string) {}

  async post(path: string, body?: unknown) {
    const res = await this.request.post(`${API_BASE}${path}`, {
      headers: authHeaders(this.token),
      data: body ?? {},
    });
    await expectOk(res, `POST ${path}`);
    const txt = await res.text();
    return txt ? JSON.parse(txt) : null;
  }

  async get(path: string) {
    const res = await this.request.get(`${API_BASE}${path}`, {
      headers: authHeaders(this.token),
    });
    await expectOk(res, `GET ${path}`);
    const txt = await res.text();
    return txt ? JSON.parse(txt) : null;
  }

  async put(path: string, body: unknown) {
    const res = await this.request.put(`${API_BASE}${path}`, {
      headers: authHeaders(this.token),
      data: body,
    });
    await expectOk(res, `PUT ${path}`);
    const txt = await res.text();
    return txt ? JSON.parse(txt) : null;
  }

  async del(path: string) {
    const res = await this.request.delete(`${API_BASE}${path}`, {
      headers: authHeaders(this.token),
    });
    await expectOk(res, `DELETE ${path}`);
  }

  // ── Course scaffold ────────────────────────────────────────────────
  createCourse(title: string) {
    return this.post(`/courses`, { title, description: "E2E all-content-types sweep" });
  }
  createModule(courseId: string, title: string) {
    return this.post(`/courses/${courseId}/modules`, { title });
  }
  createLesson(
    courseId: string,
    moduleId: string,
    body: { title: string; content_type: string; content?: Record<string, unknown> },
  ) {
    return this.post(`/courses/${courseId}/modules/${moduleId}/lessons`, {
      content: {},
      ...body,
    });
  }
  updateLessonContent(
    courseId: string,
    moduleId: string,
    lessonId: string,
    content: Record<string, unknown>,
  ) {
    return this.put(`/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}`, { content });
  }
  /**
   * An exercise, and the page block that puts it in front of a pupil.
   *
   * A lesson used to carry its content by type — a quiz lesson, an
   * interactive lesson. Since specs/027 there is one shape: pages of blocks,
   * where an exercise appears as a reference. So a test that wants a pupil to
   * meet a matching task creates the exercise, then writes a page holding a
   * block that points at it.
   */
  createExercise(body: {
    lesson_id: string;
    exercise_type: string;
    title: string;
    config: Record<string, unknown>;
  }) {
    return this.post(`/exercises`, body);
  }

  publish(courseId: string) {
    return this.post(`/courses/${courseId}/publish`);
  }
  enroll(courseId: string) {
    return this.post(`/progress/enroll`, { course_id: courseId });
  }
  deleteCourse(courseId: string) {
    return this.del(`/courses/${courseId}`);
  }

  // ── Quiz (assessments) ─────────────────────────────────────────────
  // POST /assessments/quizzes with lesson_id + inline questions
  // ({text, options[], correct: index}). Option ids are assigned by the
  // backend as the option index, which is exactly what QuizTaker submits.
  createQuiz(body: {
    lesson_id: string;
    title: string;
    passing_score?: number;
    questions: { text: string; options: string[]; correct: number }[];
  }) {
    return this.post(`/assessments/quizzes`, body);
  }

  // ── Code challenge (sandbox) ───────────────────────────────────────
  createChallenge(body: Record<string, unknown>) {
    return this.post(`/sandbox/challenges`, body);
  }
  addTestCase(challengeId: string, body: Record<string, unknown>) {
    return this.post(`/sandbox/challenges/${challengeId}/test-cases`, body);
  }
}

/**
 * Delete a course created by a test, loudly enough to matter.
 *
 * Cleanup runs against a database that is thrown away at the end of the run,
 * so an already-deleted course or a blipped connection is noise and stays a
 * warning. A 5xx is not noise: it says the server broke on a request the
 * product makes, and it is the only place that shows.
 *
 * It went unheard for exactly that reason. Every journey carried its own
 * `catch` around this call, so `DELETE /courses/{id}` answered 500 through
 * runs where every test passed (specs/044).
 */
export async function teardownCourse(api: Api | undefined, courseId: string | undefined) {
  if (!api || !courseId) return;
  try {
    await api.deleteCourse(courseId);
  } catch (e) {
    if (e instanceof ApiError && e.status >= 500) throw e;
    console.warn(`teardown deleteCourse failed: ${(e as Error).message}`);
  }
}

/** Drive the student lesson player. */
export class LessonPlayer {
  constructor(private page: Page, private courseId: string) {}

  async open(lessonId: string) {
    await this.page.goto(`${BASE_URL}/courses/${this.courseId}/lessons/${lessonId}`);
    // Title heading appears once the lesson resolves.
    await this.page.locator("h1").first().waitFor({ state: "visible", timeout: 20_000 });
  }
}
