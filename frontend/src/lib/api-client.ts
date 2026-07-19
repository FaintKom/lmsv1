import axios from "axios";
import { toast } from "sonner";

// In prod the frontend is served behind nginx which proxies /api/* to
// the backend, so a relative baseURL Just Works. In QA (and any setup
// where the frontend port is different from the backend port and there
// is no proxy in front), set NEXT_PUBLIC_API_URL at build time to point
// at the backend - e.g. `http://localhost:8000` from
// docker-compose.qa.yml's frontend build args.
// Auth rides in httpOnly cookies (set by the backend on login/refresh) —
// JS never sees the tokens, so an XSS cannot steal the session.
// withCredentials makes axios send them on every same-origin request.
const apiClient = axios.create({
 baseURL: "/api/v1",
 withCredentials: true,
 headers: {
 "Content-Type": "application/json",
 },
});

// Wake-up / rate-limit retry config
const RETRY_CODES = [429, 502, 503];
const MAX_WAKE_RETRIES = 5;
const INITIAL_RETRY_DELAY = 2000; // 2s

let wakeUpToastId: string | number | undefined;

function showWakeUpToast() {
 if (!wakeUpToastId) {
 wakeUpToastId = toast.loading("Connecting to server, please wait...", {
 duration: Infinity,
 });
 }
}

function dismissWakeUpToast() {
 if (wakeUpToastId) {
 toast.dismiss(wakeUpToastId);
 wakeUpToastId = undefined;
 }
}

function sleep(ms: number) {
 return new Promise((resolve) => setTimeout(resolve, ms));
}

// Concurrent 401 responses must share one in-flight refresh: the server
// rotates the refresh token and revokes the old one, so a parallel second
// refresh (sending the now-stale cookie) returns 400 and bounces the user
// to /login. The refresh token lives in an httpOnly cookie scoped to
// /api/v1/auth — the browser attaches it, JS never sees it.
let refreshPromise: Promise<void> | null = null;

async function performRefresh(): Promise<void> {
 if (refreshPromise) return refreshPromise;

 refreshPromise = (async () => {
 // Empty body: the server reads the refresh_token cookie and rotates
 // both cookies in the response.
 await axios.post("/api/v1/auth/refresh/", null, { withCredentials: true });
 })();

 try {
 return await refreshPromise;
 } finally {
 refreshPromise = null;
 }
}

apiClient.interceptors.response.use(
 (response) => {
 dismissWakeUpToast();
 return response;
 },
 async (error) => {
 const originalRequest = error.config;

 // Retry on 429/502/503 (rate limit or server waking up) or network error
 const isWakeError =
 (error.response && RETRY_CODES.includes(error.response.status)) ||
 (!error.response && error.code === "ERR_NETWORK");

 if (isWakeError && (originalRequest._wakeRetryCount ?? 0) < MAX_WAKE_RETRIES) {
 originalRequest._wakeRetryCount = (originalRequest._wakeRetryCount ?? 0) + 1;
 // Respect Retry-After header from 429 responses
 const retryAfter = error.response?.headers?.["retry-after"];
 const delay = retryAfter
 ? parseInt(retryAfter, 10) * 1000
 : INITIAL_RETRY_DELAY * Math.pow(2, originalRequest._wakeRetryCount - 1);
 showWakeUpToast();
 await sleep(delay);
 return apiClient(originalRequest);
 }

 // If wake retries exhausted, dismiss toast
 if (originalRequest._wakeRetryCount) {
 dismissWakeUpToast();
 }

 // Don't show toast for 401 (handled via redirect)
 if (error.response?.status === 401 && !originalRequest._retry) {
 originalRequest._retry = true;

 // Never try to refresh a failed session-establishing call itself —
 // a 401 from login/refresh/logout means the session is simply gone.
 // (/auth/me is NOT excluded: expired access + valid refresh cookie
 // should recover silently.)
 const url = String(originalRequest.url || "");
 const isAuthCall = /\/auth\/(login|refresh|logout|register|demo-login)/.test(url);
 if (!isAuthCall) {
 try {
 // Rotates the httpOnly cookies server-side; the retried request
 // picks the fresh access_token cookie up automatically.
 await performRefresh();
 return apiClient(originalRequest);
 } catch {
 window.location.href = "/login";
 }
 } else {
 window.location.href = "/login";
 }
 return Promise.reject(error);
 }

 // Show toast for server errors (500+) unless silenced
 if (error.response?.status >= 500 && !originalRequest._silentError) {
 toast.error("Server error. Please try again later.");
 }

 // Show toast for network errors (only if not already handled by wake retry)
 if (!error.response && error.code === "ERR_NETWORK" && !originalRequest._wakeRetryCount) {
 toast.error("Network error. Check your connection.");
 }

 return Promise.reject(error);
 }
);

/** Helper to extract error message from API response */
export function getApiError(error: unknown, fallback = "Something went wrong"): string {
 const err = error as { response?: { data?: { detail?: string } } };
 return err?.response?.data?.detail || fallback;
}

export default apiClient;
