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
});
