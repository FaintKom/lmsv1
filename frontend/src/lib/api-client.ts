import axios from "axios";
import { toast } from "sonner";

const apiClient = axios.create({
  baseURL: "/api/v1",
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

// Single-flight refresh: dedupe concurrent /auth/refresh attempts. Backend
// rotates jti on every successful refresh and immediately revokes the prior
// jti, so two parallel callers using the same refresh_token race — the
// first wins and the second gets 400 "Refresh token has been revoked",
// trips the catch branch below, and wipes the freshly-rotated session.
// Sharing one in-flight promise prevents that cascade.
let inFlightRefresh: Promise<{ access_token: string; refresh_token: string }> | null = null;

async function performRefresh(refreshToken: string) {
  if (!inFlightRefresh) {
    inFlightRefresh = axios
      .post("/api/v1/auth/refresh/", { refresh_token: refreshToken })
      .then((res) => {
        // Persist BOTH tokens. Backend rotates the refresh token on every
        // call (revocation tracking via jti); failing to update the stored
        // refresh_token here means the next 401 → refresh attempt sends an
        // already-revoked token and the user is silently logged out.
        localStorage.setItem("access_token", res.data.access_token);
        if (res.data.refresh_token) {
          localStorage.setItem("refresh_token", res.data.refresh_token);
        }
        return { access_token: res.data.access_token, refresh_token: res.data.refresh_token };
      })
      .finally(() => {
        inFlightRefresh = null;
      });
  }
  return inFlightRefresh;
}

apiClient.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

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

      const refreshToken = localStorage.getItem("refresh_token");
      if (refreshToken) {
        try {
          const { access_token } = await performRefresh(refreshToken);
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return apiClient(originalRequest);
        } catch {
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
          if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
            window.location.href = "/login";
          }
        }
      } else if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
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
