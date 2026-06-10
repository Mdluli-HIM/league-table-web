"use client";

import { create } from "zustand";

type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
};

type AuthState = {
  admin: AdminUser | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (token: string, admin: AdminUser) => void;
  clearAuth: () => void;
  loadAuth: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  admin: null,
  token: null,
  isAuthenticated: false,

  setAuth: (token, admin) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("league_admin_token", token);
      window.localStorage.setItem("league_admin_user", JSON.stringify(admin));
    }

    set({
      token,
      admin,
      isAuthenticated: true,
    });
  },

  clearAuth: () => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("league_admin_token");
      window.localStorage.removeItem("league_admin_user");
    }

    set({
      token: null,
      admin: null,
      isAuthenticated: false,
    });
  },

  loadAuth: () => {
    if (typeof window === "undefined") {
      return;
    }

    const token = window.localStorage.getItem("league_admin_token");
    const adminRaw = window.localStorage.getItem("league_admin_user");

    if (!token || !adminRaw) {
      return;
    }

    try {
      const admin = JSON.parse(adminRaw) as AdminUser;

      set({
        token,
        admin,
        isAuthenticated: true,
      });
    } catch {
      window.localStorage.removeItem("league_admin_token");
      window.localStorage.removeItem("league_admin_user");
    }
  },
}));
