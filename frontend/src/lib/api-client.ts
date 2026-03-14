import axios from "axios";
import { toast } from "sonner";

const apiClient = axios.create({
  baseURL: "/api/v1",
  headers: {
    "Content-Type": "application/json",
  },
});

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
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Don't show toast for 401 (handled via redirect)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = localStorage.getItem("refresh_token");
      if (refreshToken) {
        try {
          const { data } = await axios.post("/api/v1/auth/refresh/", {
            refresh_token: refreshToken,
          });

          localStorage.setItem("access_token", data.access_token);
          originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
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

    // Show toast for network errors
    if (!error.response && error.code === "ERR_NETWORK") {
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
