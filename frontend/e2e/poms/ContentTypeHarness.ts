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

/** Inject tokens into localStorage so the SPA treats the session as logged in. */
export async function authenticate(context: BrowserContext, tokens: Tokens): Promise<void> {
  await context.addInitScript((t) => {
    window.localStorage.setItem("access_token", t.access_token);
    window.localStorage.setItem("refresh_token", t.refresh_token);
  }, tokens);
}

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

async function expectOk(
  res: { ok(): boolean; status(): number; text(): Promise<string> },
  label: string,
) {
  if (!res.ok()) throw new Error(`${label}: ${res.status()} ${await res.text()}`);
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

/** Drive the student lesson player. */
export class LessonPlayer {
  constructor(private page: Page, private courseId: string) {}

  async open(lessonId: string) {
    await this.page.goto(`${BASE_URL}/courses/${this.courseId}/lessons/${lessonId}`);
    // Title heading appears once the lesson resolves.
    await this.page.locator("h1").first().waitFor({ state: "visible", timeout: 20_000 });
  }
}
