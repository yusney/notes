import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type { User, AuthTokens } from "../types";
import { ApiClientError, createApiClient, getApiBaseUrl, loadRuntimeConfig } from "../api/client";

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
    const res = await fetch(`${getApiBaseUrl()}/api/auth/refresh`, {
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
    const res = await fetch(`${getApiBaseUrl()}/api/user/profile`, {
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
  register: (name: string, email: string, password: string, rememberMe?: boolean) => Promise<void>;
  loginWithOAuth: (accessToken: string, refreshToken: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshAccessToken: () => Promise<void>;
  clearError: () => void;
}

// Lazy URL resolution via `getBaseUrl` — ensures login/register hit the
// runtime URL after `loadRuntimeConfig()` resolves. REQ-PERF-01.
const authApiClient = createApiClient({ getBaseUrl: getApiBaseUrl });

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isInitialized: false,
  isLoading: false,
  error: null,

  // Called once on app start. Tries to restore the session silently.
  // REQ-PERF-01: parallelize loadRuntimeConfig + restoreToken via Promise.all
  // so the login route can paint before token resolution completes.
  initialize: async () => {
    let refreshToken: string | null;
    try {
      // Parallel init: loadRuntimeConfig (HTTP) and restoreToken (IPC) are
      // independent — kick them off together. rawRefresh + fetchProfile stay
      // sequential because both depend on the resolved refresh token.
      const [, token] = await Promise.all([
        loadRuntimeConfig(),
        restoreToken().catch(() => null),
      ]);
      refreshToken = token;
    } catch {
      // invoke("load_token") throws when __TAURI_INTERNALS__ is undefined
      // (plain browser dev, vitest jsdom). Treat as no stored session.
      refreshToken = null;
    }

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

      // Token persistence is a wide viewport/mobile-only feature (Tauri stronghold
      // vault). On plain browser dev the invoke() throws — we swallow it so
      // login still succeeds in memory; the session won't survive a reload
      // in browser, which is acceptable for dev.
      try {
        if (rememberMe && data.refreshToken) {
          await persistToken(data.refreshToken);
        } else {
          await clearToken();
        }
      } catch {
        // ignore — session lives in memory only
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

  register: async (name, email, password, rememberMe = true) => {
    set({ isLoading: true, error: null });
    try {
      const data = await authApiClient.post<AuthTokens>(
        "/api/auth/register",
        { displayName: name, email, password }
      );

      const user = await fetchProfile(data.accessToken);
      if (!user) throw new Error("No se pudo obtener el perfil del usuario");

      try {
        if (rememberMe && data.refreshToken) {
          await persistToken(data.refreshToken);
        } else {
          await clearToken();
        }
      } catch {
        // ignore — same browser-dev caveat as in login()
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

  // Called after the OAuth deep link callback delivers tokens.
  // Always persists the refresh token (OAuth = "remember me" by nature).
  loginWithOAuth: async (accessToken: string, refreshToken: string) => {
    set({ isLoading: true, error: null });
    try {
      const user = await fetchProfile(accessToken);
      if (!user) throw new Error("No se pudo obtener el perfil del usuario");

      try {
        await persistToken(refreshToken);
      } catch {
        // ignore — same browser-dev caveat as in login()
      }

      set({
        user,
        accessToken,
        isAuthenticated: true,
        isInitialized: true,
        isLoading: false,
      });
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : "Error al iniciar sesión con OAuth";
      set({ isLoading: false, error: message });
      throw err;
    }
  },

  logout: async () => {
    let refreshToken: string | null;
    try {
      refreshToken = await restoreToken();
    } catch {
      refreshToken = null;
    }
    if (refreshToken) {
      // Fire-and-forget — revoke on backend but don't block logout.
      // Spec REQ-AUTH-02 (amended): AuthController.cs uses [Authorize] on
      // POST /api/auth/logout, so the access token must travel in the
      // Authorization header (not just the body).
      const { accessToken } = get();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (accessToken) {
        headers["Authorization"] = `Bearer ${accessToken}`;
      }
      fetch(`${getApiBaseUrl()}/api/auth/logout`, {
        method: "POST",
        headers,
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
    let refreshToken: string | null;
    try {
      refreshToken = await restoreToken();
    } catch {
      await get().logout();
      return;
    }
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

// Dev-only escape hatch so QA can mock the authenticated state in
// plain browsers (no Tauri → no `load_token` → no session restore).
// Stripped from production builds because `import.meta.env.DEV` is
// statically false at build time.
if (typeof window !== "undefined" && (import.meta as any).env?.DEV) {
  (window as unknown as { __authStore?: typeof useAuthStore }).__authStore = useAuthStore;
}
