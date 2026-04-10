import { create } from "zustand";
import apiClient from "@/lib/api-client";

export interface OrgBranding {
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  display_name: string;
}

interface User {
  id: string;
  email: string;
  full_name: string;
  role: "super_admin" | "admin" | "teacher" | "student" | "parent";
  org_id: string;
  avatar_url: string | null;
  bio: string | null;
  is_active: boolean;
  is_methodist: boolean;
  email_verified_at: string | null;
  org_branding?: OrgBranding;
}

interface AuthState {
  user: User | null;
  branding: OrgBranding;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    org_name: string;
    org_id?: string;
    full_name: string;
    email: string;
    password: string;
    role: string;
    consent_accepted?: boolean;
  }) => Promise<void>;
  logout: () => void;
  fetchUser: () => Promise<void>;
}

const DEFAULT_BRANDING: OrgBranding = {
  logo_url: null,
  primary_color: null,
  secondary_color: null,
  display_name: "GrassLMS",
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  branding: DEFAULT_BRANDING,
  isLoading: true,
  isAuthenticated: false,

  login: async (email, password) => {
    const { data } = await apiClient.post("/auth/login/", { email, password });
    localStorage.setItem("access_token", data.access_token);
    localStorage.setItem("refresh_token", data.refresh_token);
    const branding = data.user?.org_branding || DEFAULT_BRANDING;
    set({ user: data.user, branding, isAuthenticated: true, isLoading: false });
  },

  register: async (registerData) => {
    const { data } = await apiClient.post("/auth/register/", registerData);
    localStorage.setItem("access_token", data.access_token);
    localStorage.setItem("refresh_token", data.refresh_token);
    const branding = data.user?.org_branding || DEFAULT_BRANDING;
    set({ user: data.user, branding, isAuthenticated: true, isLoading: false });
  },

  logout: () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    set({ user: null, isAuthenticated: false, isLoading: false });
  },

  fetchUser: async () => {
    try {
      const { data } = await apiClient.get("/auth/me/");
      const branding = data.org_branding || DEFAULT_BRANDING;
      set({ user: data, branding, isAuthenticated: true, isLoading: false });
    } catch {
      set({ user: null, branding: DEFAULT_BRANDING, isAuthenticated: false, isLoading: false });
    }
  },
}));
