import { create } from "zustand";
import type { User, AuthTokens } from "../types";
import { API_BASE_URL, ApiClientError, createApiClient } from "../api/client";

const AUTH_STORAGE_KEY = "notes:auth";
const REMEMBER_KEY = "notes:remember";

interface StoredAuth {
  user: User;
  accessToken: string;
  refreshToken: string;
}

function persistTokens(auth: StoredAuth) {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
}

function restoreTokens(): StoredAuth | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.accessToken && parsed.refreshToken && parsed.user) {
      return parsed as StoredAuth;
    }
    return null;
  } catch {
    return null;
  }
}

function clearTokens() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

function isRemembered(): boolean {
  return localStorage.getItem(REMEMBER_KEY) === "true";
}

function setRemembered(value: boolean) {
  if (value) {
    localStorage.setItem(REMEMBER_KEY, "true");
  } else {
    localStorage.removeItem(REMEMBER_KEY);
  }
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;

  initialize: () => Promise<void>;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshAccessToken: () => Promise<void>;
  clearError: () => void;
}

const authApiClient = createApiClient({ baseUrl: API_BASE_URL });

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isInitialized: false,
  isLoading: false,
  error: null,

  initialize: async () => {
    const memo = isRemembered();
    if (!memo) {
      set({ isInitialized: true });
      return;
    }

    const stored = restoreTokens();
    if (!stored) {
      set({ isInitialized: true });
      return;
    }

    // Preload the stored tokens so apiClient has them during refresh
    set({
      user: stored.user,
      accessToken: stored.accessToken,
      refreshToken: stored.refreshToken,
    });

    try {
      const data = await authApiClient.post<AuthTokens>(
        "/api/auth/refresh",
        { refreshToken: stored.refreshToken },
      );
      const updated: StoredAuth = {
        user: stored.user,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      };
      persistTokens(updated);
      set({
        user: stored.user,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        isAuthenticated: true,
        isInitialized: true,
      });
    } catch {
      // Refresh failed — tokens are stale, clear everything and re-login
      clearTokens();
      set({
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
        isInitialized: true,
      });
    }
  },

  login: async (email, password, rememberMe = false) => {
    set({ isLoading: true, error: null });
    try {
      const data = await authApiClient.post<
        AuthTokens & { user: User }
      >("/api/auth/login", { email, password });

      setRemembered(rememberMe);

      const stored: StoredAuth = {
        user: data.user,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      };

      if (rememberMe) {
        persistTokens(stored);
      }

      set({
        user: stored.user,
        accessToken: stored.accessToken,
        refreshToken: stored.refreshToken,
        isAuthenticated: true,
        isInitialized: true,
        isLoading: false,
      });
    } catch (err) {
      const message =
        err instanceof ApiClientError ? err.message : "Error al iniciar sesión";
      set({ isLoading: false, error: message });
      throw err;
    }
  },

  register: async (name, email, password) => {
    set({ isLoading: true, error: null });
    try {
      const data = await authApiClient.post<
        AuthTokens & { user: User }
      >("/api/auth/register", { name, email, password });

      setRemembered(true); // auto-remember after registration

      const stored: StoredAuth = {
        user: data.user,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      };
      persistTokens(stored);

      set({
        user: stored.user,
        accessToken: stored.accessToken,
        refreshToken: stored.refreshToken,
        isAuthenticated: true,
        isInitialized: true,
        isLoading: false,
      });
    } catch (err) {
      const message =
        err instanceof ApiClientError ? err.message : "Error al registrarse";
      set({ isLoading: false, error: message });
      throw err;
    }
  },

  logout: () => {
    const { refreshToken } = get();
    // Fire-and-forget revoke — don't block logout on network
    if (refreshToken) {
      authApiClient
        .post("/api/auth/logout", { refreshToken })
        .catch(() => {});
    }
    clearTokens();
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      error: null,
    });
  },

  refreshAccessToken: async () => {
    const { refreshToken } = get();
    if (!refreshToken) return;
    try {
      const data = await authApiClient.post<AuthTokens>(
        "/api/auth/refresh",
        { refreshToken },
      );
      set({ accessToken: data.accessToken, refreshToken: data.refreshToken });

      // Persist refreshed tokens if remember is active
      if (isRemembered()) {
        const { user } = get();
        if (user) {
          persistTokens({
            user,
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
          });
        }
      }
    } catch {
      get().logout();
    }
  },

  clearError: () => set({ error: null }),
}));
