import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useAuthStore } from "./useAuthStore";

// Reset store between tests
beforeEach(async () => {
  await act(async () => {
    useAuthStore.setState({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isInitialized: true,
      isLoading: false,
      error: null,
    });
  });
});

describe("useAuthStore", () => {
  describe("initial state", () => {
    it("starts unauthenticated with null user and token", () => {
      const { result } = renderHook(() => useAuthStore());
      expect(result.current.user).toBeNull();
      expect(result.current.accessToken).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe("login", () => {
    it("sets user and token after successful login", async () => {
      const mockTokens = { accessToken: "access-123", refreshToken: "refresh-123" };
      const mockProfile = { id: "1", email: "test@test.com", displayName: "Test" };

      // login returns tokens, then profile fetch returns user
      global.fetch = vi.fn()
        .mockResolvedValueOnce({ ok: true, status: 200, json: async () => mockTokens })
        .mockResolvedValueOnce({ ok: true, status: 200, json: async () => mockProfile });

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.login("test@test.com", "password123", true);
      });

      expect(result.current.user).toEqual({ ...mockProfile, name: "Test" });
      expect(result.current.accessToken).toBe("access-123");
      expect(result.current.isAuthenticated).toBe(true);
    });

    it("sets error message on failed login", async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ message: "Invalid credentials" }),
      });

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.login("bad@test.com", "wrong").catch(() => {});
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.error).toBe("Invalid credentials");
    });
  });

  describe("logout", () => {
    it("clears user and token on logout", async () => {
      const { result } = renderHook(() => useAuthStore());

      act(() => {
        useAuthStore.setState({
          user: { id: "1", email: "a@b.com", name: "Test" },
          accessToken: "token-123",
          isAuthenticated: true,
        });
      });

      await act(async () => {
        await result.current.logout();
      });

      expect(result.current.user).toBeNull();
      expect(result.current.accessToken).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it("logout_sends_authorization_bearer_header_on_post_logout", async () => {
      // Spec REQ-AUTH-02 (amended): logout must hit POST /api/auth/logout
      // with an Authorization: Bearer <accessToken> header so the backend's
      // [Authorize] filter accepts the request.
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({}),
      });
      global.fetch = fetchMock;
      // Mock the tauri load_token to return a stored refresh token so the
      // existing logout branch fires the backend call.
      const { invoke } = await import("@tauri-apps/api/core");
      vi.mocked(invoke).mockImplementation((cmd: string) => {
        if (cmd === "load_token") return Promise.resolve("stored-refresh-token");
        if (cmd === "delete_token") return Promise.resolve();
        return Promise.resolve();
      });

      const { result } = renderHook(() => useAuthStore());
      act(() => {
        useAuthStore.setState({
          user: { id: "1", email: "a@b.com", name: "Test" },
          accessToken: "access-token-xyz",
          isAuthenticated: true,
        });
      });

      await act(async () => {
        await result.current.logout();
      });

      // Find the logout call — the test may also pick up other fetches
      // via test-setup mocks, so filter for the logout URL.
      const logoutCall = fetchMock.mock.calls.find(
        ([url, init]: [unknown, { method?: string }?]) =>
          typeof url === "string" &&
          url.endsWith("/api/auth/logout") &&
          init?.method === "POST"
      );
      expect(logoutCall).toBeDefined();

      const [, init] = logoutCall as [string, RequestInit];
      const headers = (init.headers ?? {}) as Record<string, string>;
      expect(headers["Authorization"]).toBe("Bearer access-token-xyz");
      expect(headers["Content-Type"]).toBe("application/json");
    });

    it("logout_uses_post_auth_logout_endpoint_not_delete_session", async () => {
      // Guard against the spec-drift back to the original
      // DELETE /api/auth/session endpoint. The amended spec (per design
      // #2202 correction 6) locks the endpoint to POST /api/auth/logout.
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({}),
      });
      global.fetch = fetchMock;
      const { invoke } = await import("@tauri-apps/api/core");
      vi.mocked(invoke).mockImplementation((cmd: string) => {
        if (cmd === "load_token") return Promise.resolve("stored-refresh-token");
        if (cmd === "delete_token") return Promise.resolve();
        return Promise.resolve();
      });

      const { result } = renderHook(() => useAuthStore());
      act(() => {
        useAuthStore.setState({
          user: { id: "1", email: "a@b.com", name: "Test" },
          accessToken: "tok",
          isAuthenticated: true,
        });
      });

      await act(async () => {
        await result.current.logout();
      });

      const logoutCall = fetchMock.mock.calls.find(
        ([url]: [unknown]) =>
          typeof url === "string" && url.includes("/api/auth/logout")
      );
      expect(logoutCall).toBeDefined();
      const [, init] = logoutCall as [string, RequestInit];
      expect(init.method).toBe("POST");
      // No call should target the old endpoint shape
      const oldEndpointCall = fetchMock.mock.calls.find(
        ([url]: [unknown]) =>
          typeof url === "string" && url.includes("/api/auth/session")
      );
      expect(oldEndpointCall).toBeUndefined();
    });
  });

  describe("register", () => {
    it("sets user and token after successful registration", async () => {
      const mockTokens = { accessToken: "access-new", refreshToken: "refresh-new" };
      const mockProfile = { id: "2", email: "new@test.com", displayName: "New User" };

      global.fetch = vi.fn()
        .mockResolvedValueOnce({ ok: true, status: 201, json: async () => mockTokens })
        .mockResolvedValueOnce({ ok: true, status: 200, json: async () => mockProfile });

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.register("New User", "new@test.com", "Password1!");
      });

      expect(result.current.user).toEqual({ ...mockProfile, name: "New User" });
      expect(result.current.isAuthenticated).toBe(true);
    });
  });

  describe("loading state", () => {
    it("sets isLoading true during login and false after", async () => {
      let resolveLogin!: (v: unknown) => void;
      const loginPromise = new Promise((res) => { resolveLogin = res; });

      global.fetch = vi.fn().mockReturnValueOnce(loginPromise);

      const { result } = renderHook(() => useAuthStore());
      const loginCall = act(async () => {
        await result.current.login("a@b.com", "pass").catch(() => {});
      });

      resolveLogin({ ok: false, status: 401, json: async () => ({ message: "err" }) });
      await loginCall;

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("initialize without Tauri runtime", () => {
    it("recovers when restoreToken throws (browser/jsdom dev mode)", async () => {
      // Simulate plain browser dev: invoke() is unavailable and throws.
      vi.doMock("@tauri-apps/api/core", () => ({
        invoke: vi.fn().mockRejectedValue(new Error("__TAURI_INTERNALS__ is not defined")),
      }));
      const { useAuthStore: storeWithoutTauri } = await import("./useAuthStore");

      const { result } = renderHook(() => storeWithoutTauri());

      await act(async () => {
        await result.current.initialize();
      });

      // App must initialize (sets isInitialized=true) instead of staying
      // stuck on the LoadingScreen forever.
      expect(result.current.isInitialized).toBe(true);
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
      vi.doUnmock("@tauri-apps/api/core");
    });
  });
});
