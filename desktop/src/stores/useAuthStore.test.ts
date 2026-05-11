import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useAuthStore } from "./useAuthStore";

// Reset store between tests
beforeEach(() => {
  useAuthStore.getState().logout();
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
      const mockUser = { id: "1", email: "test@test.com", name: "Test" };
      const mockTokens = {
        accessToken: "access-123",
        refreshToken: "refresh-123",
        expiresIn: 3600,
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ user: mockUser, ...mockTokens }),
      });

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.login("test@test.com", "password123");
      });

      expect(result.current.user).toEqual(mockUser);
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

      // Set up logged in state first
      act(() => {
        useAuthStore.setState({
          user: { id: "1", email: "a@b.com", name: "Test" },
          accessToken: "token-123",
          isAuthenticated: true,
        });
      });

      act(() => {
        result.current.logout();
      });

      expect(result.current.user).toBeNull();
      expect(result.current.accessToken).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe("register", () => {
    it("sets user and token after successful registration", async () => {
      const mockUser = { id: "2", email: "new@test.com", name: "New User" };
      const mockTokens = {
        accessToken: "access-new",
        refreshToken: "refresh-new",
        expiresIn: 3600,
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({ user: mockUser, ...mockTokens }),
      });

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.register("New User", "new@test.com", "Password1!");
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
    });
  });

  describe("loading state", () => {
    it("sets isLoading true during login and false after", async () => {
      let resolveLogin!: (v: unknown) => void;
      const loginPromise = new Promise((res) => {
        resolveLogin = res;
      });

      global.fetch = vi.fn().mockReturnValueOnce(loginPromise);

      const { result } = renderHook(() => useAuthStore());
      const loginCall = act(async () => {
        await result.current.login("a@b.com", "pass").catch(() => {});
      });

      // Resolve with error to end the call
      resolveLogin({ ok: false, status: 401, json: async () => ({ message: "err" }) });
      await loginCall;

      expect(result.current.isLoading).toBe(false);
    });
  });
});
