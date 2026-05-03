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

// Concurrent 401 responses must share one in-flight refresh: the server
// rotates the refresh token and revokes the old one, so a parallel second
// refresh with the stale token returns 400 and bounces the user to /login.
let refreshPromise: Promise<string> | null = null;

async function performRefresh(): Promise<string> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refreshToken = localStorage.getItem("refresh_token");
    if (!refreshToken) throw new Error("No refresh token");
    const { data } = await axios.post("/api/v1/auth/refresh/", {
      refresh_token: refreshToken,
    });
    localStorage.setItem("access_token", data.access_token);
    if (data.refresh_token) {
      localStorage.setItem("refresh_token", data.refresh_token);
    }
    return data.access_token as string;
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
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

      if (localStorage.getItem("refresh_token")) {
        try {
          const newAccessToken = await performRefresh();
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return apiClient(originalRequest);
        } catch {
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
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
