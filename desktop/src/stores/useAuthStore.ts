import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type { User, AuthTokens } from "../types";
import { API_BASE_URL, ApiClientError, createApiClient } from "../api/client";

// ─── OS Keychain access via Tauri commands ────────────────────────────────────
// The refresh token is stored in the OS keychain (Keychain on macOS,
// Credential Manager on Windows, Secret Service on Linux).
// It never touches localStorage or any file on disk in plaintext.
// The access token always lives in memory only — never persisted.

async function persistToken(refreshToken: string): Promise<void> {
  await invoke("save_token", { token: refreshToken });
}

async function restoreToken(): Promise<string | null> {
  return invoke<string | null>("load_token");
}

async function clearToken(): Promise<void> {
  await invoke("delete_token");
}

// ─── Raw refresh — plain fetch, bypasses the API client interceptor ──────────
// This prevents the 401-retry loop that would happen if we used apiClient here.
async function rawRefresh(refreshToken: string): Promise<AuthTokens | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: refreshToken }),
    });
    if (!res.ok) return null;
    return res.json() as Promise<AuthTokens>;
  } catch {
    return null;
  }
}

// ─── Raw profile fetch ────────────────────────────────────────────────────────
async function fetchProfile(accessToken: string): Promise<User | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/user/profile`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return { ...data, name: data.displayName ?? data.name ?? data.email } as User;
  } catch {
    return null;
  }
}

// ─── Store interface ──────────────────────────────────────────────────────────

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;

  initialize: () => Promise<void>;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshAccessToken: () => Promise<void>;
  clearError: () => void;
}

const authApiClient = createApiClient({ baseUrl: API_BASE_URL });

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isInitialized: false,
  isLoading: false,
  error: null,

  // Called once on app start. Tries to restore the session silently.
  initialize: async () => {
    const refreshToken = await restoreToken();

    if (!refreshToken) {
      set({ isInitialized: true });
      return;
    }

    const tokens = await rawRefresh(refreshToken);

    if (!tokens?.accessToken) {
      // Stale token — clear it and show login
      await clearToken();
      set({ isInitialized: true });
      return;
    }

    // Rotate refresh token if the server issued a new one
    if (tokens.refreshToken && tokens.refreshToken !== refreshToken) {
      await persistToken(tokens.refreshToken);
    }

    // Fetch user profile with the fresh access token
    const user = await fetchProfile(tokens.accessToken);
    if (!user) {
      await clearToken();
      set({ isInitialized: true });
      return;
    }

    set({
      user,
      accessToken: tokens.accessToken,
      isAuthenticated: true,
      isInitialized: true,
    });
  },

  login: async (email, password, rememberMe = false) => {
    set({ isLoading: true, error: null });
    try {
      const data = await authApiClient.post<AuthTokens>(
        "/api/auth/login",
        { email, password, rememberMe }
      );

      const user = await fetchProfile(data.accessToken);
      if (!user) throw new Error("No se pudo obtener el perfil del usuario");

      if (rememberMe && data.refreshToken) {
        await persistToken(data.refreshToken);
      } else {
        await clearToken();
      }

      set({
        user,
        accessToken: data.accessToken,
        isAuthenticated: true,
        isInitialized: true,
        isLoading: false,
      });
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : "Error al iniciar sesión";
      set({ isLoading: false, error: message });
      throw err;
    }
  },

  register: async (name, email, password) => {
    set({ isLoading: true, error: null });
    try {
      const data = await authApiClient.post<AuthTokens>(
        "/api/auth/register",
        { displayName: name, email, password }
      );

      const user = await fetchProfile(data.accessToken);
      if (!user) throw new Error("No se pudo obtener el perfil del usuario");

      // Always persist after registration
      if (data.refreshToken) {
        await persistToken(data.refreshToken);
      }

      set({
        user,
        accessToken: data.accessToken,
        isAuthenticated: true,
        isInitialized: true,
        isLoading: false,
      });
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : "Error al registrarse";
      set({ isLoading: false, error: message });
      throw err;
    }
  },

  logout: async () => {
    const refreshToken = await restoreToken();
    if (refreshToken) {
      // Fire-and-forget — revoke on backend but don't block logout
      fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: refreshToken }),
      }).catch(() => {});
    }
    await clearToken();
    set({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isInitialized: true,
      error: null,
    });
  },

  // Called by the API client interceptor on 401.
  // Uses raw fetch to avoid triggering another interceptor cycle.
  refreshAccessToken: async () => {
    const refreshToken = await restoreToken();
    if (!refreshToken) {
      await get().logout();
      return;
    }

    const tokens = await rawRefresh(refreshToken);
    if (!tokens?.accessToken) {
      await get().logout();
      return;
    }

    if (tokens.refreshToken && tokens.refreshToken !== refreshToken) {
      await persistToken(tokens.refreshToken);
    }

    set({ accessToken: tokens.accessToken });
  },

  clearError: () => set({ error: null }),
}));
